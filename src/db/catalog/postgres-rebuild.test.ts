import postgres from "postgres";
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
import {
  type CatalogQueryExecutor,
  createCatalogRepository,
} from "./repository";

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

    const client = postgres(target.url, { max: 1 });
    try {
      const executor: CatalogQueryExecutor = {
        dialect: "postgres",
        async query<T extends Record<string, unknown>>(
          statement: string,
          parameters: unknown[] = [],
        ) {
          const rows = await client.unsafe(statement, parameters as never[]);
          return [...rows] as unknown as T[];
        },
      };
      const repository = createCatalogRepository(executor);
      const dune = await repository.listWorkSummaries("Dune");
      expect(dune.length).toBeGreaterThan(0);
      const detail = await repository.getWorkDetail(dune[0].id);
      expect(detail?.id).toBe(dune[0].id);
      expect(JSON.stringify(detail)).not.toMatch(/rating|trending/i);
      const firstPage = await repository.pageWorkSummaries({ limit: 7 });
      const secondPage = await repository.pageWorkSummaries({
        limit: 7,
        after: firstPage.nextCursor,
      });
      expect(
        new Set(
          [...firstPage.items, ...secondPage.items].map((work) => work.id),
        ).size,
      ).toBe(14);
    } finally {
      await client.end({ timeout: 5_000 });
    }
  }, 120_000);
});
