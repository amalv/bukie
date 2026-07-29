import postgres from "postgres";
import { describe, expect, it } from "vitest";
import { buildCatalogImportGraph } from "../../importer";
import { rebuildCatalogPostgres } from "../../postgres-rebuild";
import { resolveRebuildTarget } from "../../rebuild-safety";
import { SAMPLE_BASELINE_IMPORT_RECORDS } from "../fixtures";
import {
  DESCRIPTION_FIXTURE_ALTERNATE_TEXT,
  DESCRIPTION_FIXTURE_TEXT,
  editorialDescriptionFixture,
  licensedDescriptionFixture,
  modelDescriptionFixture,
  seedDescriptionFixturesPostgres,
} from "./fixtures";
import {
  createDescriptionCandidatePostgres,
  descriptionMetricsPostgres,
  reviewDescriptionCandidatePostgres,
  transitionDescriptionCandidatePostgres,
} from "./repository.pg";
import { DESCRIPTION_POLICY_VERSION } from "./types";

const isolatedUrl = process.env.CATALOG_TEST_POSTGRES_URL;
const NOW = Date.UTC(2026, 6, 29, 12, 0, 0);

describe.skipIf(!isolatedUrl)(
  "Postgres evidence-gated description lifecycle",
  () => {
    it("matches SQLite lifecycle, queue, retry, rollback, and metrics behavior", async () => {
      const target = resolveRebuildTarget({
        rawTarget: `postgres:${isolatedUrl}`,
        confirmDisposable: true,
        env: { NODE_ENV: "test" },
      });
      if (target.driver !== "postgres") {
        throw new Error("Expected an isolated Postgres target");
      }
      await rebuildCatalogPostgres({
        url: target.url,
        graph: buildCatalogImportGraph(SAMPLE_BASELINE_IMPORT_RECORDS),
      });
      await seedDescriptionFixturesPostgres(target.url);

      const modelInput = modelDescriptionFixture();
      const model = await createDescriptionCandidatePostgres({
        url: target.url,
        candidate: modelInput,
        queueCapacity: 3,
      });
      const retry = await createDescriptionCandidatePostgres({
        url: target.url,
        candidate: modelInput,
        queueCapacity: 3,
      });
      expect(model.state).toBe("review_required");
      expect(model.queue).toBe("queued");
      expect(retry.changed).toBe(false);
      expect(retry.queue).toBe("deduplicated");
      await expect(
        reviewDescriptionCandidatePostgres({
          url: target.url,
          candidateId: model.candidateId,
          reviewerRef: "user:pg-reviewer",
          decision: "approve",
          reason: "Postgres evidence review",
          acknowledgedWarningCodes: model.validation.warningCodes,
          reviewedAt: NOW,
          failAfter: "queue",
        }),
      ).rejects.toThrow("Forced Postgres description review");
      const client = postgres(target.url, { max: 1 });
      try {
        const rows = await client.unsafe(
          `select d.state, q.state as "queueState"
           from description_decision_heads h
           join description_decisions d on d.id = h.decision_id
           join description_review_queue q on q.candidate_id = h.candidate_id
           where h.candidate_id = $1`,
          [model.candidateId],
        );
        expect(rows[0]).toMatchObject({
          state: "review_required",
          queueState: "queued",
        });
      } finally {
        await client.end({ timeout: 5_000 });
      }
      await reviewDescriptionCandidatePostgres({
        url: target.url,
        candidateId: model.candidateId,
        reviewerRef: "user:pg-reviewer",
        decision: "approve",
        reason: "Postgres evidence review",
        acknowledgedWarningCodes: model.validation.warningCodes,
        reviewedAt: NOW + 1,
      });

      const editorial = await createDescriptionCandidatePostgres({
        url: target.url,
        candidate: editorialDescriptionFixture(),
        queueCapacity: 3,
      });
      await expect(
        reviewDescriptionCandidatePostgres({
          url: target.url,
          candidateId: editorial.candidateId,
          reviewerRef: "user:editor-fixture",
          decision: "approve",
          reason: "Self review",
          acknowledgedWarningCodes: editorial.validation.warningCodes,
          reviewedAt: NOW + 2,
        }),
      ).rejects.toThrow("reviewer must differ from editor");
      await reviewDescriptionCandidatePostgres({
        url: target.url,
        candidateId: editorial.candidateId,
        reviewerRef: "user:pg-editorial-reviewer",
        decision: "approve",
        reason: "Editorial evidence and revision reviewed",
        acknowledgedWarningCodes: editorial.validation.warningCodes,
        reviewedAt: NOW + 3,
      });

      const licensedRejected = await createDescriptionCandidatePostgres({
        url: target.url,
        candidate: licensedDescriptionFixture(undefined, {
          text: DESCRIPTION_FIXTURE_ALTERNATE_TEXT,
          license: {
            name: "Recorded fixture license",
            url: "https://example.invalid/recorded-fixture-license",
            attributionText: "Recorded fixture source",
            derivativesPermitted: true,
            sourceText: DESCRIPTION_FIXTURE_TEXT,
            transformed: true,
          },
        }),
        queueCapacity: 3,
      });
      expect(licensedRejected.state).toBe("rejected");
      expect(licensedRejected.validation.rejectionCodes).toContain(
        "licensed_derivative_not_permitted",
      );

      const overflow = await createDescriptionCandidatePostgres({
        url: target.url,
        candidate: licensedDescriptionFixture(undefined, {
          text: DESCRIPTION_FIXTURE_TEXT,
          createdAt: NOW + 4,
          sensitiveContent: true,
        }),
        queueCapacity: 0,
      });
      expect(overflow.state).toBe("paused");
      expect(overflow.queue).toBe("overflow_paused");

      await transitionDescriptionCandidatePostgres({
        url: target.url,
        candidateId: model.candidateId,
        state: "withdrawn",
        actorRef: "user:pg-reviewer",
        reason: "Postgres withdrawal proof",
        policyVersion: DESCRIPTION_POLICY_VERSION,
        at: NOW + 5,
      });
      await transitionDescriptionCandidatePostgres({
        url: target.url,
        candidateId: editorial.candidateId,
        state: "invalidated",
        actorRef: "system:pg-policy",
        reason: "Postgres policy invalidation proof",
        policyVersion: "description-gates-pg-v2",
        at: NOW + 6,
      });
      const metrics = await descriptionMetricsPostgres({
        url: target.url,
        scopeWorks: 5,
      });
      expect(metrics).toMatchObject({
        candidates: 4,
        rejected: 1,
        eligible: 0,
        withdrawn: 1,
        invalidated: 1,
        paused: 1,
        byClass: {
          licensed_verbatim: 2,
          bukie_editorial: 1,
          model_assisted_candidate: 1,
        },
      });
      expect(metrics.tokens).toEqual({
        input: 320,
        output: 112,
        total: 432,
      });
      expect(metrics.estimate500.costMicrousd).toBe(420_000);
    }, 120_000);
  },
);
