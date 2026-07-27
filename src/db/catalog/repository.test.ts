import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import type Database from "better-sqlite3";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import type { CatalogQuery, CatalogSort } from "@/features/books/catalogQuery";
import { encodeCursor } from "@/features/books/pagination";
import { ADR_REPRESENTATIVE_RECORDS } from "./fixtures";
import { buildCatalogImportGraph } from "./importer";
import {
  type CatalogQueryExecutor,
  type CatalogRepository,
  createCatalogRepository,
} from "./repository";
import { openCatalogSqlite, rebuildCatalogSqlite } from "./sqlite-rebuild";

describe("normalized catalog repository", () => {
  const directory = mkdtempSync(path.join(tmpdir(), "bukie-catalog-repo-"));
  const sqlitePath = path.join(directory, "repository.sqlite");
  let repository: CatalogRepository;
  let raw: InstanceType<typeof Database>;

  beforeAll(() => {
    rebuildCatalogSqlite({
      sqlitePath,
      graph: buildCatalogImportGraph(ADR_REPRESENTATIVE_RECORDS),
    });
    ({ raw } = openCatalogSqlite(sqlitePath));
    const executor: CatalogQueryExecutor = {
      dialect: "sqlite",
      async query<T extends Record<string, unknown>>(
        statement: string,
        parameters: unknown[] = [],
      ) {
        return raw.prepare(statement).all(...parameters) as T[];
      },
    };
    repository = createCatalogRepository(executor);
  });

  afterAll(() => {
    raw.close();
    rmSync(directory, { recursive: true, force: true });
  });

  const query = (overrides: Partial<CatalogQuery> = {}): CatalogQuery => ({
    sort: "title",
    ...overrides,
  });

  it("pages by stable sort title and work ID without duplicates", async () => {
    const first = await repository.pageWorkSummaries({
      query: query(),
      limit: 5,
    });
    const second = await repository.pageWorkSummaries({
      query: query(),
      limit: 5,
      after: first.nextCursor,
    });
    expect(first.items).toHaveLength(5);
    expect(first.hasNext).toBe(true);
    expect(
      new Set([...first.items, ...second.items].map((work) => work.id)).size,
    ).toBe(first.items.length + second.items.length);
    expect(first.items.map((work) => work.title)).toEqual(
      [...first.items.map((work) => work.title)].sort((left, right) =>
        left.localeCompare(right),
      ),
    );
  });

  it("searches selected titles and ordered author names", async () => {
    const byTitle = await repository.listWorkSummaries(
      query({ q: "Glass Harbors" }),
    );
    const byAuthor = await repository.listWorkSummaries(
      query({ q: "Tomas Grey" }),
    );
    expect(byTitle).toHaveLength(1);
    expect(byAuthor.map((work) => work.id)).toEqual(
      byTitle.map((work) => work.id),
    );
  });

  it("projects work details with preferred/all editions and ordered relations", async () => {
    const [summary] = await repository.listWorkSummaries(
      query({ q: "Glass Harbors" }),
    );
    const detail = await repository.getWorkDetail(summary.id);
    expect(detail?.authors.map((author) => author.name)).toEqual([
      "Tomas Grey",
    ]);
    expect(detail?.categories.map((category) => category.label)).toEqual([
      "Fantasy",
    ]);
    expect(detail?.editions).toHaveLength(2);
    expect(detail?.preferredEdition?.id).toBe(detail?.editions[0]?.id);
    expect(
      detail?.editions.map((edition) => edition.languages[0]?.tag),
    ).toEqual(["en", "es"]);
  });

  it("keeps missing metadata absent and never projects rating/popularity fields", async () => {
    const [summary] = await repository.listWorkSummaries(
      query({ q: "Empty Colophon" }),
    );
    const detail = await repository.getWorkDetail(summary.id);
    expect(detail?.authors).toEqual([]);
    expect(detail?.preferredEdition?.identifiers).toEqual([]);
    expect(detail?.preferredEdition?.cover).toBeUndefined();
    expect(JSON.stringify(detail)).not.toMatch(/rating|trending|popularity/i);
  });

  it("returns deterministic new arrivals", async () => {
    const first = await repository.listNewArrivals(4);
    const second = await repository.listNewArrivals(4);
    expect(second.map((work) => work.id)).toEqual(first.map((work) => work.id));
  });

  it("lists active normalized category slugs deterministically", async () => {
    const categories = await repository.listCategories();
    expect(categories).toContainEqual({
      slug: "science-fiction",
      label: "Science Fiction",
    });
    expect(categories.map((category) => category.label)).toEqual(
      [...categories.map((category) => category.label)].sort((left, right) =>
        left.localeCompare(right),
      ),
    );
  });

  it("combines title/author search, normalized category, and publication period", async () => {
    const result = await repository.pageWorkSummaries({
      query: query({
        q: "June",
        category: "classics",
        period: "1950-1999",
        sort: "publication",
      }),
      limit: 10,
    });
    expect(result.items.map((work) => work.title)).toEqual(["June, Precisely"]);
    expect(result.total).toBe(1);
  });

  it("orders every supported sort deterministically", async () => {
    const byTitle = await repository.listWorkSummaries(query());
    expect(byTitle.map((work) => work.title)).toEqual(
      [...byTitle.map((work) => work.title)].sort((left, right) =>
        left.localeCompare(right),
      ),
    );

    const byAddition = await repository.listWorkSummaries(
      query({ sort: "added" }),
    );
    const additionKeys = byAddition.map(
      (work) =>
        [
          work.preferredEdition?.catalogedAt ?? Number.NEGATIVE_INFINITY,
          work.id,
        ] as const,
    );
    expect(additionKeys).toEqual(
      [...additionKeys].sort(
        (left, right) => right[0] - left[0] || left[1].localeCompare(right[1]),
      ),
    );

    const byPublication = await repository.listWorkSummaries(
      query({ sort: "publication" }),
    );
    const publicationDates = byPublication
      .map((work) => work.preferredEdition?.publication?.date)
      .filter((date): date is string => Boolean(date));
    expect(publicationDates).toEqual(
      [...publicationDates].sort((left, right) => right.localeCompare(left)),
    );
    const firstMissing = byPublication.findIndex(
      (work) => !work.preferredEdition?.publication,
    );
    expect(
      byPublication
        .slice(firstMissing)
        .every((work) => !work.preferredEdition?.publication),
    ).toBe(true);
  });

  it.each<CatalogSort>([
    "title",
    "added",
    "publication",
  ])("keeps %s cursors stable without skips or duplicates", async (sort) => {
    const activeQuery = query({ sort });
    const expected = await repository.listWorkSummaries(activeQuery);
    const actual: string[] = [];
    let after: string | undefined;
    do {
      const page = await repository.pageWorkSummaries({
        query: activeQuery,
        after,
        limit: 4,
      });
      actual.push(...page.items.map((work) => work.id));
      after = page.nextCursor;
    } while (after);
    expect(actual).toEqual(expected.map((work) => work.id));
    expect(new Set(actual).size).toBe(actual.length);
  });

  it("restarts safely for malformed or sort-mismatched cursors", async () => {
    const activeQuery = query({ sort: "publication" });
    const expected = await repository.pageWorkSummaries({
      query: activeQuery,
      limit: 3,
    });
    const mismatched = encodeCursor({
      version: 1,
      sort: "title",
      sortTitle: "zzzz",
      id: "work-id",
    });
    for (const after of ["invalid", mismatched]) {
      const result = await repository.pageWorkSummaries({
        query: activeQuery,
        after,
        limit: 3,
      });
      expect(result.items.map((work) => work.id)).toEqual(
        expected.items.map((work) => work.id),
      );
    }
  });

  it("treats special search input literally and invalid categories as empty results", async () => {
    await expect(
      repository.listWorkSummaries(query({ q: "%" })),
    ).resolves.toEqual([]);
    await expect(
      repository.listWorkSummaries(query({ category: "../invalid" })),
    ).resolves.toEqual([]);
  });

  it("excludes missing publication metadata only when a period is active", async () => {
    const allByPublication = await repository.listWorkSummaries(
      query({ sort: "publication" }),
    );
    expect(
      allByPublication.some((work) => work.title === "The Empty Colophon"),
    ).toBe(true);
    const period = await repository.listWorkSummaries(
      query({ period: "1950-1999", sort: "publication" }),
    );
    expect(
      period.every((work) => Boolean(work.preferredEdition?.publication)),
    ).toBe(true);
    expect(period.some((work) => work.title === "The Empty Colophon")).toBe(
      false,
    );
  });
});
