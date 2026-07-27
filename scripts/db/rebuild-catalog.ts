import baseCatalog from "../../artifacts/catalog";
import {
  buildCatalogImportGraph,
  catalogGraphCounts,
  legacyBooksToImportRecords,
  type CatalogImportGraph,
} from "../../src/db/catalog/importer";
import { rebuildCatalogPostgres } from "../../src/db/catalog/postgres-rebuild";
import { resolveRebuildTarget } from "../../src/db/catalog/rebuild-safety";
import { rebuildCatalogSqlite } from "../../src/db/catalog/sqlite-rebuild";

function readArg(name: string): string | undefined {
  const prefix = `--${name}=`;
  return process.argv.find((value) => value.startsWith(prefix))?.slice(
    prefix.length,
  );
}

async function main() {
  const target = resolveRebuildTarget({
    rawTarget: readArg("target"),
    confirmDisposable: process.argv.includes("--confirm-disposable"),
  });
  const failAfterTable = readArg(
    "fail-after-table",
  ) as keyof CatalogImportGraph | undefined;
  const graph = buildCatalogImportGraph(legacyBooksToImportRecords(baseCatalog));

  console.info("[catalog:rebuild] validated target:", target.description);
  console.info("[catalog:rebuild] planned counts:", catalogGraphCounts(graph));

  if (target.driver === "sqlite") {
    const snapshot = rebuildCatalogSqlite({
      sqlitePath: target.path,
      graph,
      failAfterTable,
    });
    console.info("[catalog:rebuild] completed:", {
      target: target.description,
      snapshotHash: snapshot.hash,
    });
    return;
  }

  await rebuildCatalogPostgres({
    url: target.url,
    graph,
    failAfterTable,
  });
  console.info("[catalog:rebuild] completed:", {
    target: target.description,
  });
}

main().catch((error: unknown) => {
  const message = error instanceof Error ? error.message : String(error);
  console.error("[catalog:rebuild] failed:", message);
  process.exitCode = 1;
});
