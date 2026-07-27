import { describe, expect, it } from "vitest";
import baseCatalog from "@/../artifacts/catalog";
import {
  buildCatalogImportGraph,
  legacyBooksToImportRecords,
} from "./importer";
import {
  catalogPostgresSnapshot,
  rebuildCatalogPostgres,
} from "./postgres-rebuild";
import { resolveRebuildTarget } from "./rebuild-safety";

const isolatedUrl = process.env.CATALOG_TEST_POSTGRES_URL;

describe.skipIf(!isolatedUrl)("Postgres normalized catalog rebuild", () => {
  it("creates, rebuilds, and rolls back deterministically on an isolated target", async () => {
    const target = resolveRebuildTarget({
      rawTarget: `postgres:${isolatedUrl}`,
      confirmDisposable: true,
      env: { NODE_ENV: "test" },
    });
    if (target.driver !== "postgres") {
      throw new Error("Expected an isolated Postgres target");
    }
    const graph = buildCatalogImportGraph(
      legacyBooksToImportRecords(baseCatalog),
    );
    await rebuildCatalogPostgres({ url: target.url, graph });
    const first = await catalogPostgresSnapshot(target.url);
    await rebuildCatalogPostgres({ url: target.url, graph });
    const second = await catalogPostgresSnapshot(target.url);
    expect(second.hash).toBe(first.hash);
    expect(second.tables.works).toHaveLength(500);
    expect(second.tables.editions).toHaveLength(500);

    await expect(
      rebuildCatalogPostgres({
        url: target.url,
        graph,
        failAfterTable: "editions",
      }),
    ).rejects.toThrow("Forced catalog importer failure after editions");
    expect((await catalogPostgresSnapshot(target.url)).hash).toBe(first.hash);
  }, 120_000);
});
