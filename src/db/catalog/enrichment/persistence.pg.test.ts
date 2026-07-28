import { describe, expect, it } from "vitest";
import { buildCatalogImportGraph } from "../importer";
import { rebuildCatalogPostgres } from "../postgres-rebuild";
import { resolveRebuildTarget } from "../rebuild-safety";
import {
  SAMPLE_BASELINE_IMPORT_RECORDS,
  SAMPLE_PROVIDER_RECORDS,
} from "./fixtures";
import { persistEnrichmentRunPostgres } from "./persistence.pg";
import { ENRICHMENT_SAMPLE_MANIFEST } from "./sample-manifest";
import { buildEnrichmentRun } from "./workflow";

const isolatedUrl = process.env.CATALOG_TEST_POSTGRES_URL;

describe.skipIf(!isolatedUrl)(
  "Postgres five-work enrichment persistence",
  () => {
    it("is idempotent and preserves current heads on an isolated target", async () => {
      const target = resolveRebuildTarget({
        rawTarget: `postgres:${isolatedUrl}`,
        confirmDisposable: true,
        env: { NODE_ENV: "test" },
      });
      if (target.driver !== "postgres") {
        throw new Error("Expected an isolated Postgres target");
      }
      const graph = buildCatalogImportGraph(SAMPLE_BASELINE_IMPORT_RECORDS);
      const run = buildEnrichmentRun({
        requestedWorkIds: ENRICHMENT_SAMPLE_MANIFEST.works.map(
          (work) => work.workId,
        ),
        records: SAMPLE_PROVIDER_RECORDS,
      });
      await rebuildCatalogPostgres({ url: target.url, graph });
      const first = await persistEnrichmentRunPostgres({
        url: target.url,
        run,
      });
      const second = await persistEnrichmentRunPostgres({
        url: target.url,
        run,
      });
      expect(first.created).toEqual({
        metadataSources: 2,
        sourceRecords: 10,
        sourceRecordLinks: 10,
        fieldObservations: 9,
      });
      expect(second.created).toEqual({
        metadataSources: 0,
        sourceRecords: 0,
        sourceRecordLinks: 0,
        fieldObservations: 0,
      });
      expect(second.reused).toEqual({
        metadataSources: 2,
        sourceRecords: 10,
        sourceRecordLinks: 10,
        fieldObservations: 9,
      });
      expect(second.currentHeadHash).toBe(first.currentHeadHash);
    }, 120_000);
  },
);
