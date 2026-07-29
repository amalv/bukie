import postgres from "postgres";
import { describe, expect, it, vi } from "vitest";
import { PLACEHOLDER_COVER } from "../../../../media/covers";
import { buildCatalogImportGraph } from "../../importer";
import { rebuildCatalogPostgres } from "../../postgres-rebuild";
import { resolveRebuildTarget } from "../../rebuild-safety";
import { SAMPLE_BASELINE_IMPORT_RECORDS } from "../fixtures";
import { ENRICHMENT_SAMPLE_MANIFEST } from "../sample-manifest";
import {
  approvedCoverFixture,
  recordedFiveCoverFixtures,
  seedCoverFixturesPostgres,
} from "./fixtures";
import {
  createCoverCandidatePostgres,
  getCoverSelectionPostgres,
  retryCoverWithdrawalPurgePostgres,
  reviewCoverCandidatePostgres,
  rollbackCoverProjectionPostgres,
  withdrawCoverCandidatePostgres,
} from "./repository.pg";

const isolatedUrl = process.env.CATALOG_TEST_POSTGRES_URL;
const NOW = Date.UTC(2026, 6, 29, 14, 0, 0);

describe.skipIf(!isolatedUrl)(
  "Postgres edition-matched cover lifecycle",
  () => {
    it("matches SQLite fixtures, idempotency, rollback, withdrawal, and public isolation", async () => {
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
      await seedCoverFixturesPostgres(target.url);
      const client = postgres(target.url, { max: 1 });
      const editionIds: Record<string, string> = {};
      let publicBefore: unknown;
      try {
        for (const work of ENRICHMENT_SAMPLE_MANIFEST.works) {
          const rows = await client.unsafe(
            "select preferred_edition_id as id from works where id = $1",
            [work.workId],
          );
          editionIds[work.workId] = String(rows[0]?.id);
        }
        publicBefore = (
          await client.unsafe(
            `select
             (select count(*)::int from edition_covers) as relations,
             (select count(*)::int from field_resolution_heads
               where field_key = 'edition.covers') as heads`,
          )
        )[0];
      } finally {
        await client.end({ timeout: 5_000 });
      }

      const recorded = recordedFiveCoverFixtures({ editionIds });
      const results = [];
      for (const fixture of recorded) {
        results.push({
          title: fixture.title,
          result: await createCoverCandidatePostgres({
            url: target.url,
            ...fixture,
          }),
        });
      }
      expect(results.find((row) => row.title === "Dune")?.result).toMatchObject(
        {
          state: "rejected",
          gateCodes: expect.arrayContaining(["identity_conflict"]),
          warningCodes: expect.arrayContaining(["square_canvas", "sidebars"]),
        },
      );
      expect(
        results.find((row) => row.title === "Moby-Dick")?.result,
      ).toMatchObject({
        state: "rejected",
        gateCodes: expect.arrayContaining([
          "locale_conflict",
          "adaptation_conflict",
        ]),
      });
      expect(
        await getCoverSelectionPostgres({
          url: target.url,
          workId: recorded[2].candidate.workId,
        }),
      ).toMatchObject({
        candidateId: null,
        objectKey: PLACEHOLDER_COVER,
        publicDisplayEligible: false,
      });

      const work = ENRICHMENT_SAMPLE_MANIFEST.works[0];
      const fallback = approvedCoverFixture({
        workId: work.workId,
        editionId: editionIds[work.workId],
        suffix: "pg-fallback",
        qualityScore: 80,
      });
      const fallbackResult = await createCoverCandidatePostgres({
        url: target.url,
        ...fallback,
      });
      const retry = await createCoverCandidatePostgres({
        url: target.url,
        ...fallback,
      });
      expect(retry).toMatchObject({
        candidateId: fallbackResult.candidateId,
        changed: false,
      });
      await expect(
        createCoverCandidatePostgres({
          url: target.url,
          ...approvedCoverFixture({
            workId: work.workId,
            editionId: editionIds[work.workId],
            suffix: "pg-failed",
          }),
          failAfter: "decision",
        }),
      ).rejects.toThrow("Forced Postgres cover decision failure");

      const historyClient = postgres(target.url, { max: 1 });
      let fallbackProjectionId: string;
      try {
        const row = await historyClient.unsafe(
          "select projection_id as id from cover_projection_heads where work_id = $1",
          [work.workId],
        );
        fallbackProjectionId = String(row[0]?.id);
      } finally {
        await historyClient.end({ timeout: 5_000 });
      }
      const preferred = approvedCoverFixture({
        workId: work.workId,
        editionId: editionIds[work.workId],
        suffix: "pg-preferred",
        qualityScore: 95,
      });
      preferred.inspection.flags = ["square_canvas"];
      const preferredResult = await createCoverCandidatePostgres({
        url: target.url,
        ...preferred,
      });
      expect(preferredResult.state).toBe("review_required");
      await expect(
        reviewCoverCandidatePostgres({
          url: target.url,
          candidateId: preferredResult.candidateId,
          reviewerRef: "user:pg-cover-reviewer",
          decision: "approve",
          reason: "Review the square-canvas fixture",
          acknowledgedWarningCodes: [],
          reviewedAt: NOW,
        }),
      ).rejects.toThrow("warnings not acknowledged");
      await expect(
        reviewCoverCandidatePostgres({
          url: target.url,
          candidateId: preferredResult.candidateId,
          reviewerRef: "user:pg-cover-reviewer",
          decision: "approve",
          reason: "Reviewed the square-canvas fixture",
          acknowledgedWarningCodes: ["square_canvas"],
          reviewedAt: NOW + 1,
        }),
      ).resolves.toMatchObject({ state: "eligible" });
      const purge = vi.fn();
      await withdrawCoverCandidatePostgres({
        url: target.url,
        candidateId: preferredResult.candidateId,
        actorRef: "user:pg-cover-withdrawal",
        reason: "Postgres fixture withdrawal",
        withdrawnAt: NOW + 2,
        purgeAsset: purge,
      });
      expect(purge).toHaveBeenCalledWith(preferred.candidate.objectKey);
      const repeatedPurge = vi.fn();
      await expect(
        withdrawCoverCandidatePostgres({
          url: target.url,
          candidateId: preferredResult.candidateId,
          actorRef: "user:pg-cover-withdrawal",
          reason: "Repeated Postgres fixture withdrawal",
          withdrawnAt: NOW + 3,
          purgeAsset: repeatedPurge,
        }),
      ).resolves.toMatchObject({ changed: false, state: "withdrawn" });
      expect(repeatedPurge).not.toHaveBeenCalled();
      expect(
        await getCoverSelectionPostgres({
          url: target.url,
          workId: work.workId,
        }),
      ).toMatchObject({ candidateId: fallbackResult.candidateId });

      const replacement = approvedCoverFixture({
        workId: work.workId,
        editionId: editionIds[work.workId],
        suffix: "pg-replacement",
        qualityScore: 99,
      });
      const replacementResult = await createCoverCandidatePostgres({
        url: target.url,
        ...replacement,
      });
      const rolledBack = await rollbackCoverProjectionPostgres({
        url: target.url,
        workId: work.workId,
        targetProjectionId: fallbackProjectionId,
        actorRef: "user:pg-rollback",
        reason: "Restore reviewed fallback",
        rolledBackAt: NOW + 4,
      });
      expect(rolledBack.selection).toMatchObject({
        candidateId: fallbackResult.candidateId,
        state: "rolled_back",
      });
      await expect(
        rollbackCoverProjectionPostgres({
          url: target.url,
          workId: work.workId,
          targetProjectionId: fallbackProjectionId,
          actorRef: "user:pg-rollback",
          reason: "Repeated reviewed fallback rollback",
          rolledBackAt: NOW + 5,
        }),
      ).resolves.toMatchObject({ changed: false });

      const failedPurge = vi
        .fn()
        .mockRejectedValueOnce(new Error("pg purge failed"));
      await expect(
        withdrawCoverCandidatePostgres({
          url: target.url,
          candidateId: replacementResult.candidateId,
          actorRef: "user:pg-cover-withdrawal",
          reason: "Exercise Postgres purge retry",
          withdrawnAt: NOW + 6,
          purgeAsset: failedPurge,
        }),
      ).rejects.toThrow("pg purge failed");
      const retryPurge = vi.fn();
      await expect(
        retryCoverWithdrawalPurgePostgres({
          url: target.url,
          candidateId: replacementResult.candidateId,
          purgeAsset: retryPurge,
        }),
      ).resolves.toBe(true);
      expect(retryPurge).toHaveBeenCalledWith(replacement.candidate.objectKey);

      const finalClient = postgres(target.url, { max: 1 });
      try {
        const publicAfter = (
          await finalClient.unsafe(
            `select
             (select count(*)::int from edition_covers) as relations,
             (select count(*)::int from field_resolution_heads
               where field_key = 'edition.covers') as heads`,
          )
        )[0];
        expect(publicAfter).toEqual(publicBefore);
        expect(
          await finalClient.unsafe(
            "select count(*)::int as count from cover_candidates",
          ),
        ).toEqual([expect.objectContaining({ count: 8 })]);
      } finally {
        await finalClient.end({ timeout: 5_000 });
      }
    });

    it("enforces hard gates and canonicalizes duplicates independently of arrival order", async () => {
      const target = resolveRebuildTarget({
        rawTarget: `postgres:${isolatedUrl}`,
        confirmDisposable: true,
        env: { NODE_ENV: "test" },
      });
      if (target.driver !== "postgres") {
        throw new Error("Expected an isolated Postgres target");
      }
      const rebuild = async () => {
        await rebuildCatalogPostgres({
          url: target.url,
          graph: buildCatalogImportGraph(SAMPLE_BASELINE_IMPORT_RECORDS),
        });
        await seedCoverFixturesPostgres(target.url);
        const client = postgres(target.url, { max: 1 });
        try {
          const workId = ENRICHMENT_SAMPLE_MANIFEST.works[0].workId;
          const edition = await client.unsafe(
            "select preferred_edition_id as id from works where id = $1",
            [workId],
          );
          return { workId, editionId: String(edition[0]?.id) };
        } finally {
          await client.end({ timeout: 5_000 });
        }
      };

      const identifiers = await rebuild();
      const policyClient = postgres(target.url, { max: 1 });
      let originalPolicy: Record<string, unknown> = {};
      try {
        const source = await policyClient.unsafe(
          `select asset_policy as policy from metadata_sources
           where key = 'cover_recorded_fixtures'`,
        );
        originalPolicy = source[0]?.policy as Record<string, unknown>;
        const fieldPermission = {
          ...(originalPolicy.fieldPermission as Record<string, unknown>),
          cache: false,
          transform: false,
        };
        await policyClient.unsafe(
          `update metadata_sources set asset_policy = $1::jsonb
           where key = 'cover_recorded_fixtures'`,
          [
            {
              ...originalPolicy,
              cache: false,
              transform: false,
              fieldPermission,
            },
          ],
        );
      } finally {
        await policyClient.end({ timeout: 5_000 });
      }
      const deniedPolicy = approvedCoverFixture({
        ...identifiers,
        suffix: "pg-denied-cache-transform",
      });
      deniedPolicy.candidate.transformationHistory = [
        {
          operation: "webp",
          version: "1",
          parameters: { quality: 80 },
        },
      ];
      await expect(
        createCoverCandidatePostgres({
          url: target.url,
          ...deniedPolicy,
        }),
      ).resolves.toMatchObject({
        state: "rejected",
        gateCodes: expect.arrayContaining(["source_policy_ineligible"]),
      });

      const tupleClient = postgres(target.url, { max: 1 });
      try {
        await tupleClient.unsafe(
          `update metadata_sources set asset_policy = $1::jsonb
           where key = 'cover_recorded_fixtures'`,
          [originalPolicy as postgres.JSONValue],
        );
        await tupleClient.unsafe(
          `update source_record_links set match_kind = 'candidate'
           where entity_type = 'edition' and entity_id = $1`,
          [identifiers.editionId],
        );
      } finally {
        await tupleClient.end({ timeout: 5_000 });
      }
      const selfApprovedTuple = approvedCoverFixture({
        ...identifiers,
        suffix: "pg-self-approved-tuple",
      });
      selfApprovedTuple.candidate.identityMatchKind =
        "approved_strong_edition_tuple";
      selfApprovedTuple.candidate.identityEvidence = {
        policyApproved: true,
        title: "Unverified title",
        publisher: "Unverified publisher",
      };
      await expect(
        createCoverCandidatePostgres({
          url: target.url,
          ...selfApprovedTuple,
        }),
      ).resolves.toMatchObject({
        state: "review_required",
        gateCodes: expect.arrayContaining(["identity_evidence_ineligible"]),
      });

      const duplicateMaps = async (
        reverse: boolean,
      ): Promise<{
        flags: Record<string, unknown>;
        states: Record<string, unknown>;
        winner: string | null;
      }> => {
        const current = await rebuild();
        const first = approvedCoverFixture({
          ...current,
          suffix: "pg-duplicate-a",
        });
        const second = approvedCoverFixture({
          ...current,
          suffix: "pg-duplicate-b",
        });
        second.inspection.checksum = first.inspection.checksum;
        const candidateIds: string[] = [];
        for (const fixture of reverse ? [second, first] : [first, second]) {
          candidateIds.push(
            (
              await createCoverCandidatePostgres({
                url: target.url,
                ...fixture,
              })
            ).candidateId,
          );
        }
        const client = postgres(target.url, { max: 1 });
        try {
          const inspections = await client.unsafe(
            `select candidate_id as id, flags_json as flags
             from cover_inspections where checksum = $1 order by candidate_id`,
            [first.inspection.checksum],
          );
          const decisions = await client.unsafe(
            `select h.candidate_id as id, d.state,
                    d.warning_codes_json as warnings
             from cover_decision_heads h
             join cover_decisions d on d.id = h.decision_id
             where h.candidate_id in ($1, $2)
             order by h.candidate_id`,
            candidateIds,
          );
          return {
            flags: Object.fromEntries(
              inspections.map((row) => [String(row.id), row.flags]),
            ),
            states: Object.fromEntries(
              decisions.map((row) => [
                String(row.id),
                { state: row.state, warnings: row.warnings },
              ]),
            ),
            winner: (
              await getCoverSelectionPostgres({
                url: target.url,
                workId: current.workId,
              })
            ).candidateId,
          };
        } finally {
          await client.end({ timeout: 5_000 });
        }
      };
      expect(await duplicateMaps(true)).toEqual(await duplicateMaps(false));
    });
  },
);
