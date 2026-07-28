import {
  enrichmentSqliteSnapshot,
  persistEnrichmentRunSqlite,
} from "@/db/catalog/enrichment/persistence";
import {
  SAMPLE_BASELINE_IMPORT_RECORDS,
  SAMPLE_PROVIDER_RECORDS,
} from "@/db/catalog/enrichment/fixtures";
import { ENRICHMENT_SAMPLE_MANIFEST } from "@/db/catalog/enrichment/sample-manifest";
import { buildEnrichmentRun } from "@/db/catalog/enrichment/workflow";
import { buildCatalogImportGraph } from "@/db/catalog/importer";
import { resolveRebuildTarget } from "@/db/catalog/rebuild-safety";
import {
  openCatalogSqlite,
  rebuildCatalogSqlite,
} from "@/db/catalog/sqlite-rebuild";

const rawTarget = process.argv
  .find((argument) => argument.startsWith("--target="))
  ?.slice("--target=".length);
const target = resolveRebuildTarget({
  rawTarget,
  confirmDisposable: process.argv.includes("--confirm-disposable"),
});
if (target.driver !== "sqlite") {
  throw new Error(
    "The issue #131 diagnostic workflow currently accepts disposable SQLite targets only",
  );
}

const workIds = ENRICHMENT_SAMPLE_MANIFEST.works.map((work) => work.workId);
const graph = buildCatalogImportGraph(SAMPLE_BASELINE_IMPORT_RECORDS);
const run = buildEnrichmentRun({
  manifest: ENRICHMENT_SAMPLE_MANIFEST,
  requestedWorkIds: workIds,
  records: SAMPLE_PROVIDER_RECORDS,
});

rebuildCatalogSqlite({ sqlitePath: target.path, graph });
const { raw } = openCatalogSqlite(target.path);
try {
  const first = persistEnrichmentRunSqlite(raw, run);
  const firstSnapshot = enrichmentSqliteSnapshot(raw, run);
  const second = persistEnrichmentRunSqlite(raw, run);
  const secondSnapshot = enrichmentSqliteSnapshot(raw, run);
  if (firstSnapshot.hash !== secondSnapshot.hash) {
    throw new Error("Enrichment sample rerun was not logically stable");
  }
  if (first.currentHeadHash !== second.currentHeadHash) {
    throw new Error("Enrichment sample changed current resolution heads");
  }
  console.log(
    JSON.stringify(
      {
        target: target.description,
        manifest: `${run.manifestId}@${run.manifestVersion}`,
        requestedWorkIds: run.requestedWorkIds,
        contentHash: run.contentHash,
        snapshotHash: secondSnapshot.hash,
        first,
        second,
        report: run.report,
        safeguards: {
          catalogWideScan: false,
          publicProjectionWrites: false,
          currentResolutionHeadWrites: false,
          pendingProviderWrites: false,
        },
      },
      null,
      2,
    ),
  );
} finally {
  raw.close();
}
