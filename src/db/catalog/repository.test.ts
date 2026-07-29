import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import type Database from "better-sqlite3";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import type { CatalogQuery, CatalogSort } from "@/features/books/catalogQuery";
import { encodeCursor } from "@/features/books/pagination";
import { provenanceFixture } from "@/test/catalog-fixtures";
import { ADR_REPRESENTATIVE_RECORDS } from "./fixtures";
import { buildCatalogImportGraph } from "./importer";
import {
  type CatalogQueryExecutor,
  type CatalogRepository,
  createCatalogRepository,
  isDetailFieldDisplayEligible,
} from "./repository";
import { openCatalogSqlite, rebuildCatalogSqlite } from "./sqlite-rebuild";

describe("normalized catalog repository", () => {
  const directory = mkdtempSync(path.join(tmpdir(), "bukie-catalog-repo-"));
  const sqlitePath = path.join(directory, "repository.sqlite");
  let repository: CatalogRepository;
  let raw: InstanceType<typeof Database>;
  let queryCount = 0;

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
        queryCount += 1;
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
    const beforeDetailQueries = queryCount;
    const detail = await repository.getWorkDetail(summary.id);
    expect(queryCount - beforeDetailQueries).toBeLessThanOrEqual(11);
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
    expect(
      detail?.provenance.find(
        (item) =>
          item.entityId === detail.preferredEdition?.id &&
          item.field === "edition.publication_date",
      ),
    ).toMatchObject({
      state: "present",
      evidence: {
        sourceKey: "legacy_catalog",
        sourceName: "Bukie legacy catalog artifact",
        sourceApproval: "approved",
        kind: "imported",
        eligible: true,
      },
    });
    expect(
      detail?.provenance.find(
        (item) => item.field === "work.preferred_edition",
      ),
    ).toMatchObject({
      state: "present",
      evidence: {
        sourceKey: "bukie_derivation",
        kind: "derived",
        eligible: true,
      },
    });
  });

  it("keeps missing metadata absent and never projects rating/popularity fields", async () => {
    const [summary] = await repository.listWorkSummaries(
      query({ q: "Empty Colophon" }),
    );
    const detail = await repository.getWorkDetail(summary.id);
    expect(detail?.authors).toEqual([]);
    expect(detail?.preferredEdition?.identifiers).toEqual([]);
    expect(detail?.preferredEdition?.cover).toBeUndefined();
    expect(
      detail?.provenance.find(
        (item) =>
          item.entityId === detail.preferredEdition?.id &&
          item.field === "edition.identifiers",
      )?.state,
    ).toBe("missing");
    expect(
      detail?.provenance.find(
        (item) =>
          item.entityId === detail.preferredEdition?.id &&
          item.field === "edition.covers",
      )?.state,
    ).toBe("missing");
    expect(JSON.stringify(detail)).not.toMatch(/rating|trending|popularity/i);
  });

  it("requires an eligible source record, link, and display policy", () => {
    const present = provenanceFixture("work", "work-id", "work.description");
    if (!present.evidence) throw new Error("Expected fixture evidence");
    expect(isDetailFieldDisplayEligible(present)).toBe(true);
    expect(isDetailFieldDisplayEligible({ ...present, state: "stale" })).toBe(
      true,
    );
    expect(
      isDetailFieldDisplayEligible({ ...present, state: "conflicting" }),
    ).toBe(false);
    expect(
      isDetailFieldDisplayEligible({
        ...present,
        evidence: { ...present.evidence, eligible: false },
      }),
    ).toBe(false);
  });

  it("omits fields selected from withdrawn or invalid observations", async () => {
    const [summary] = await repository.listWorkSummaries(
      query({ q: "Glass Harbors" }),
    );
    const initial = await repository.getWorkDetail(summary.id);
    const editionId = initial?.preferredEdition?.id;
    expect(initial?.preferredEdition?.pages).toBe(384);
    expect(editionId).toBeTruthy();

    const selected = raw
      .prepare(
        `select r.selected_observation_id as id
         from field_resolution_heads h
         join field_resolutions r on r.id = h.resolution_id
         where h.entity_type = 'edition'
           and h.entity_id = ?
           and h.field_key = 'edition.pages'`,
      )
      .get(editionId) as { id: string } | undefined;
    expect(selected?.id).toBeTruthy();

    for (const state of ["withdrawn", "invalid"] as const) {
      raw.exec("begin");
      try {
        raw
          .prepare("update field_observations set state = ? where id = ?")
          .run(state, selected?.id);
        const detail = await repository.getWorkDetail(summary.id);
        expect(detail?.preferredEdition?.pages).toBeUndefined();
        expect(
          detail?.provenance.find(
            (item) =>
              item.entityId === editionId && item.field === "edition.pages",
          )?.evidence?.eligible,
        ).toBe(false);
      } finally {
        raw.exec("rollback");
      }
    }
  });

  it("uses asset policy rather than metadata policy for covers", async () => {
    const [summary] = await repository.listWorkSummaries(
      query({ q: "Glass Harbors" }),
    );
    const initial = await repository.getWorkDetail(summary.id);
    expect(initial?.preferredEdition?.cover).toBeDefined();
    expect(initial?.preferredEdition?.pages).toBe(384);

    raw.exec("begin");
    try {
      raw
        .prepare(
          "update metadata_sources set asset_policy = ? where key = 'legacy_catalog'",
        )
        .run(JSON.stringify({ display: false }));
      const detail = await repository.getWorkDetail(summary.id);
      expect(detail?.preferredEdition?.cover).toBeUndefined();
      expect(detail?.preferredEdition?.pages).toBe(384);
      expect(
        detail?.provenance.find(
          (item) =>
            item.entityId === detail?.preferredEdition?.id &&
            item.field === "edition.covers",
        )?.evidence?.eligible,
      ).toBe(false);
    } finally {
      raw.exec("rollback");
    }
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
      version: 2,
      queryKey: "",
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

  it("restarts safely when a cursor is reused with different filters and the same sort", async () => {
    const source = await repository.pageWorkSummaries({
      query: query({ category: "science-fiction" }),
      limit: 1,
    });
    const expected = await repository.pageWorkSummaries({
      query: query({ category: "fantasy" }),
      limit: 2,
    });
    const result = await repository.pageWorkSummaries({
      query: query({ category: "fantasy" }),
      after: source.nextCursor,
      limit: 2,
    });
    expect(result.items.map((work) => work.id)).toEqual(
      expected.items.map((work) => work.id),
    );
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

  it("keeps publication sorting and period filters edition-based", async () => {
    const beforeSort = await repository.listWorkSummaries(
      query({ sort: "publication" }),
    );
    const beforePeriod = await repository.listWorkSummaries(
      query({ period: "1950-1999", sort: "publication" }),
    );
    raw.exec("begin");
    try {
      for (const [index, work] of beforeSort.entries()) {
        const year = String(1900 + (beforeSort.length - index)).padStart(
          4,
          "0",
        );
        raw
          .prepare(
            `update works
             set first_publication_date = ?,
                 first_publication_precision = 'year',
                 first_publication_sort_date = ?
             where id = ?`,
          )
          .run(year, `${year}-01-01`, work.id);
      }
      const afterSort = await repository.listWorkSummaries(
        query({ sort: "publication" }),
      );
      const afterPeriod = await repository.listWorkSummaries(
        query({ period: "1950-1999", sort: "publication" }),
      );
      expect(afterSort.map((work) => work.id)).toEqual(
        beforeSort.map((work) => work.id),
      );
      expect(afterPeriod.map((work) => work.id)).toEqual(
        beforePeriod.map((work) => work.id),
      );
    } finally {
      raw.exec("rollback");
    }
  });
});
