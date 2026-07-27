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
      const dune = await repository.listWorkSummaries({
        q: "Dune",
        sort: "title",
      });
      expect(dune.length).toBeGreaterThan(0);
      const detail = await repository.getWorkDetail(dune[0].id);
      expect(detail?.id).toBe(dune[0].id);
      expect(JSON.stringify(detail)).not.toMatch(/rating|trending/i);
      const firstPage = await repository.pageWorkSummaries({
        query: { sort: "title" },
        limit: 7,
      });
      const secondPage = await repository.pageWorkSummaries({
        query: { sort: "title" },
        limit: 7,
        after: firstPage.nextCursor,
      });
      expect(
        new Set(
          [...firstPage.items, ...secondPage.items].map((work) => work.id),
        ).size,
      ).toBe(14);

      const combined = await repository.pageWorkSummaries({
        query: {
          q: "Dune",
          category: "science-fiction",
          period: "1950-1999",
          sort: "publication",
        },
        limit: 10,
      });
      expect(combined.items.map((work) => work.title)).toContain("Dune");

      for (const sort of ["title", "added", "publication"] as const) {
        const expected = await repository.listWorkSummaries({ sort });
        const actual: string[] = [];
        let after: string | undefined;
        do {
          const page = await repository.pageWorkSummaries({
            query: { sort },
            after,
            limit: 37,
          });
          actual.push(...page.items.map((work) => work.id));
          after = page.nextCursor;
        } while (after);
        expect(actual).toEqual(expected.map((work) => work.id));
      }

      const byPublication = await repository.listWorkSummaries({
        sort: "publication",
      });
      const firstMissing = byPublication.findIndex(
        (work) => !work.preferredEdition?.publication,
      );
      expect(firstMissing).toBeGreaterThan(0);
      expect(
        byPublication
          .slice(firstMissing)
          .every((work) => !work.preferredEdition?.publication),
      ).toBe(true);
      const invalidCursorPage = await repository.pageWorkSummaries({
        query: { sort: "publication" },
        after: "invalid",
        limit: 7,
      });
      expect(invalidCursorPage.items.map((work) => work.id)).toEqual(
        byPublication.slice(0, 7).map((work) => work.id),
      );

      const sourceFilterPage = await repository.pageWorkSummaries({
        query: { category: "science-fiction", sort: "title" },
        limit: 50,
      });
      const expectedFantasyPage = await repository.pageWorkSummaries({
        query: { category: "fantasy", sort: "title" },
        limit: 7,
      });
      const mismatchedFilterPage = await repository.pageWorkSummaries({
        query: { category: "fantasy", sort: "title" },
        after: sourceFilterPage.nextCursor,
        limit: 7,
      });
      expect(mismatchedFilterPage.items.map((work) => work.id)).toEqual(
        expectedFantasyPage.items.map((work) => work.id),
      );
    } finally {
      await client.end({ timeout: 5_000 });
    }
  }, 120_000);
});
