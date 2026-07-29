import postgres from "postgres";
import { describe, expect, it } from "vitest";
import { buildCatalogImportGraph } from "../../importer";
import { rebuildCatalogPostgres } from "../../postgres-rebuild";
import { resolveRebuildTarget } from "../../rebuild-safety";
import { SAMPLE_BASELINE_IMPORT_RECORDS } from "../fixtures";
import { ENRICHMENT_SAMPLE_MANIFEST } from "../sample-manifest";
import {
  DESCRIPTION_FIXTURE_ALTERNATE_TEXT,
  DESCRIPTION_FIXTURE_SOURCE_ID,
  DESCRIPTION_FIXTURE_TEXT,
  descriptionFixtureAlternateText,
  descriptionFixtureIds,
  editorialDescriptionFixture,
  licensedDescriptionFixture,
  modelDescriptionFixture,
  seedDescriptionFixturesPostgres,
} from "./fixtures";
import {
  createDescriptionCandidatePostgres,
  descriptionMetricsPostgres,
  getDescriptionProposalPostgres,
  reconcileDescriptionCandidatePostgres,
  requestDescriptionRereviewPostgres,
  retryDescriptionQueuePostgres,
  reviewDescriptionCandidatePostgres,
  rollbackDescriptionProjectionPostgres,
  transitionDescriptionCandidatePostgres,
} from "./repository.pg";
import { DESCRIPTION_POLICY_VERSION } from "./types";

const isolatedUrl = process.env.CATALOG_TEST_POSTGRES_URL;
const NOW = Date.UTC(2026, 6, 29, 12, 0, 0);
const MODEL_REVIEW_POLICY = {
  descriptionPolicyVersion: DESCRIPTION_POLICY_VERSION,
  currentModelVersion: "fixture-model-v1",
  currentPromptVersion: "fixture-prompt-v1",
} as const;

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
      expect(retry.validation.warningCodes).toEqual(
        model.validation.warningCodes,
      );
      const unsupported = await createDescriptionCandidatePostgres({
        url: target.url,
        candidate: modelDescriptionFixture(undefined, {
          claims: [
            {
              text: "Unsupported fixture claim",
              parentObservationIds: ["missing"],
            },
          ],
          createdAt: NOW + 7,
        }),
        queueCapacity: 3,
      });
      expect(unsupported.state).toBe("rejected");
      expect(unsupported.validation.rejectionCodes).toEqual(
        expect.arrayContaining([
          "claim_unsupported",
          "specificity_insufficient",
        ]),
      );
      await expect(
        reviewDescriptionCandidatePostgres({
          ...MODEL_REVIEW_POLICY,
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
        ...MODEL_REVIEW_POLICY,
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
          descriptionPolicyVersion: DESCRIPTION_POLICY_VERSION,
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
        descriptionPolicyVersion: DESCRIPTION_POLICY_VERSION,
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
        candidates: 5,
        rejected: 2,
        eligible: 0,
        withdrawn: 1,
        invalidated: 1,
        paused: 1,
        byClass: {
          licensed_verbatim: 2,
          bukie_editorial: 1,
          model_assisted_candidate: 2,
        },
      });
      expect(metrics.tokens).toEqual({
        input: 640,
        output: 224,
        total: 864,
      });
      expect(metrics.estimate500.costMicrousd).toBe(840_000);
    }, 120_000);

    it("matches SQLite re-review, live-policy, queue, rollback, and read behavior", async () => {
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

      const rejected = await createDescriptionCandidatePostgres({
        url: target.url,
        candidate: modelDescriptionFixture(undefined, {
          claims: [
            {
              text: "Unsupported fixture claim.",
              parentObservationIds: ["missing"],
            },
          ],
        }),
        queueCapacity: 3,
      });
      await expect(
        requestDescriptionRereviewPostgres({
          url: target.url,
          candidateId: rejected.candidateId,
          policyVersion: "description-gates-pg-v2",
          currentModelVersion: "fixture-model-v1",
          currentPromptVersion: "fixture-prompt-v1",
          queueCapacity: 3,
          requestedAt: NOW,
        }),
      ).rejects.toThrow("hard rejection");

      const modelInput = modelDescriptionFixture(
        ENRICHMENT_SAMPLE_MANIFEST.works[1].workId,
      );
      const model = await createDescriptionCandidatePostgres({
        url: target.url,
        candidate: modelInput,
        queueCapacity: 3,
      });
      const client = postgres(target.url, { max: 1 });
      try {
        await client.unsafe(
          "update metadata_sources set approval_state = 'suspended' where id = $1",
          [DESCRIPTION_FIXTURE_SOURCE_ID],
        );
      } finally {
        await client.end({ timeout: 5_000 });
      }
      await expect(
        reviewDescriptionCandidatePostgres({
          ...MODEL_REVIEW_POLICY,
          url: target.url,
          candidateId: model.candidateId,
          reviewerRef: "user:pg-stale-reviewer",
          decision: "approve",
          reason: "Stale evidence must not pass",
          acknowledgedWarningCodes: model.validation.warningCodes,
          reviewedAt: NOW + 1,
        }),
      ).rejects.toThrow("current evidence or policy is ineligible");
      const restoreClient = postgres(target.url, { max: 1 });
      try {
        await restoreClient.unsafe(
          "update metadata_sources set approval_state = 'approved' where id = $1",
          [DESCRIPTION_FIXTURE_SOURCE_ID],
        );
      } finally {
        await restoreClient.end({ timeout: 5_000 });
      }
      await reviewDescriptionCandidatePostgres({
        ...MODEL_REVIEW_POLICY,
        url: target.url,
        candidateId: model.candidateId,
        reviewerRef: "user:pg-live-reviewer",
        decision: "approve",
        reason: "Current evidence reviewed",
        acknowledgedWarningCodes: model.validation.warningCodes,
        reviewedAt: NOW + 2,
      });
      expect(
        await getDescriptionProposalPostgres({
          url: target.url,
          workId: modelInput.workId,
          descriptionPolicyVersion: DESCRIPTION_POLICY_VERSION,
          currentModelVersion: modelInput.model.modelVersion,
          currentPromptVersion: modelInput.model.promptVersion,
        }),
      ).toBeDefined();
      expect(
        await reconcileDescriptionCandidatePostgres({
          url: target.url,
          candidateId: model.candidateId,
          descriptionPolicyVersion: "description-gates-pg-v2",
          currentModelVersion: modelInput.model.modelVersion,
          currentPromptVersion: modelInput.model.promptVersion,
          queueCapacity: 3,
          reconciledAt: NOW + 3,
        }),
      ).toBe("rereview_required");

      const overflowInput = licensedDescriptionFixture(
        ENRICHMENT_SAMPLE_MANIFEST.works[4].workId,
        { sensitiveContent: true },
      );
      const overflow = await createDescriptionCandidatePostgres({
        url: target.url,
        candidate: overflowInput,
        queueCapacity: 0,
      });
      expect(overflow.state).toBe("paused");
      expect(
        await retryDescriptionQueuePostgres({
          url: target.url,
          candidateId: overflow.candidateId,
          queueCapacity: 3,
          now: NOW + 4,
        }),
      ).toBe("queued");

      const rollbackWorkId = ENRICHMENT_SAMPLE_MANIFEST.works[2].workId;
      const firstInput = licensedDescriptionFixture(rollbackWorkId, {
        sensitiveContent: true,
      });
      const first = await createDescriptionCandidatePostgres({
        url: target.url,
        candidate: firstInput,
        queueCapacity: 3,
      });
      await reviewDescriptionCandidatePostgres({
        descriptionPolicyVersion: DESCRIPTION_POLICY_VERSION,
        url: target.url,
        candidateId: first.candidateId,
        reviewerRef: "user:pg-first-reviewer",
        decision: "approve",
        reason: "First rollback fixture reviewed",
        acknowledgedWarningCodes: first.validation.warningCodes,
        reviewedAt: NOW + 5,
      });
      const projectionClient = postgres(target.url, { max: 1 });
      let firstProjectionId: string;
      try {
        const rows = await projectionClient.unsafe(
          "select projection_id as id from description_projection_heads where work_id = $1",
          [rollbackWorkId],
        );
        firstProjectionId = String(rows[0].id);
      } finally {
        await projectionClient.end({ timeout: 5_000 });
      }
      const secondText = descriptionFixtureAlternateText(rollbackWorkId);
      const second = await createDescriptionCandidatePostgres({
        url: target.url,
        candidate: licensedDescriptionFixture(rollbackWorkId, {
          text: secondText,
          sensitiveContent: true,
          license: {
            name: "Recorded fixture license",
            url: "https://example.invalid/recorded-fixture-license",
            attributionText: "Recorded fixture source",
            derivativesPermitted: false,
            sourceText: secondText,
            transformed: false,
          },
        }),
        queueCapacity: 3,
      });
      await reviewDescriptionCandidatePostgres({
        descriptionPolicyVersion: DESCRIPTION_POLICY_VERSION,
        url: target.url,
        candidateId: second.candidateId,
        reviewerRef: "user:pg-second-reviewer",
        decision: "approve",
        reason: "Second rollback fixture reviewed",
        acknowledgedWarningCodes: second.validation.warningCodes,
        reviewedAt: NOW + 6,
      });
      await rollbackDescriptionProjectionPostgres({
        url: target.url,
        workId: rollbackWorkId,
        targetProjectionId: firstProjectionId,
        actorRef: "user:pg-rollback-reviewer",
        reason: "rollback_approved",
        policyVersion: DESCRIPTION_POLICY_VERSION,
        rolledBackAt: NOW + 7,
      });
      expect(
        (
          await getDescriptionProposalPostgres({
            url: target.url,
            workId: rollbackWorkId,
            descriptionPolicyVersion: DESCRIPTION_POLICY_VERSION,
          })
        )?.candidateId,
      ).toBe(first.candidateId);

      const derivativeClient = postgres(target.url, { max: 1 });
      try {
        await derivativeClient.unsafe(
          `update metadata_sources
           set metadata_policy = jsonb_set(
             metadata_policy, '{textPermission,transform}', 'true'::jsonb
           )
           where id = $1`,
          [DESCRIPTION_FIXTURE_SOURCE_ID],
        );
      } finally {
        await derivativeClient.end({ timeout: 5_000 });
      }
      const derivativeWorkId = ENRICHMENT_SAMPLE_MANIFEST.works[3].workId;
      const derivative = await createDescriptionCandidatePostgres({
        url: target.url,
        candidate: licensedDescriptionFixture(derivativeWorkId, {
          text: descriptionFixtureAlternateText(derivativeWorkId),
          license: {
            name: "Recorded derivative fixture license",
            url: "https://example.invalid/recorded-derivative-license",
            attributionText: "Recorded derivative fixture source",
            derivativesPermitted: true,
            sourceText: DESCRIPTION_FIXTURE_TEXT,
            transformed: true,
          },
        }),
        queueCapacity: 3,
      });
      expect(derivative.validation.rejectionCodes).not.toContain(
        "licensed_derivative_not_permitted",
      );

      const reviewedBefore = (
        await descriptionMetricsPostgres({ url: target.url, scopeWorks: 5 })
      ).reviewed;
      await transitionDescriptionCandidatePostgres({
        url: target.url,
        candidateId: overflow.candidateId,
        state: "withdrawn",
        actorRef: "system:pg-withdrawal",
        reason: "Unreviewed withdrawal",
        policyVersion: DESCRIPTION_POLICY_VERSION,
        at: NOW + 8,
      });
      expect(
        (await descriptionMetricsPostgres({ url: target.url, scopeWorks: 5 }))
          .reviewed,
      ).toBe(reviewedBefore);

      const revokeClient = postgres(target.url, { max: 1 });
      try {
        await revokeClient.unsafe(
          "update field_observations set state = 'withdrawn' where id = $1",
          [descriptionFixtureIds(modelInput.workId).parents[0]],
        );
      } finally {
        await revokeClient.end({ timeout: 5_000 });
      }
      expect(
        await getDescriptionProposalPostgres({
          url: target.url,
          workId: modelInput.workId,
          descriptionPolicyVersion: "description-gates-pg-v2",
          currentModelVersion: modelInput.model.modelVersion,
          currentPromptVersion: modelInput.model.promptVersion,
        }),
      ).toBeUndefined();
    }, 120_000);
  },
);
