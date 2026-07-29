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
      const preferredResult = await createCoverCandidatePostgres({
        url: target.url,
        ...preferred,
      });
      const purge = vi.fn();
      await withdrawCoverCandidatePostgres({
        url: target.url,
        candidateId: preferredResult.candidateId,
        actorRef: "user:pg-cover-withdrawal",
        reason: "Postgres fixture withdrawal",
        withdrawnAt: NOW,
        purgeAsset: purge,
      });
      expect(purge).toHaveBeenCalledWith(preferred.candidate.objectKey);
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
      await createCoverCandidatePostgres({ url: target.url, ...replacement });
      const rolledBack = await rollbackCoverProjectionPostgres({
        url: target.url,
        workId: work.workId,
        targetProjectionId: fallbackProjectionId,
        actorRef: "user:pg-rollback",
        reason: "Restore reviewed fallback",
        rolledBackAt: NOW + 1,
      });
      expect(rolledBack.selection).toMatchObject({
        candidateId: fallbackResult.candidateId,
        state: "rolled_back",
      });

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
  },
);
