import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import type Database from "better-sqlite3";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
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

  it("pages by stable sort title and work ID without duplicates", async () => {
    const first = await repository.pageWorkSummaries({ limit: 5 });
    const second = await repository.pageWorkSummaries({
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
    const byTitle = await repository.listWorkSummaries("Glass Harbors");
    const byAuthor = await repository.listWorkSummaries("Tomas Grey");
    expect(byTitle).toHaveLength(1);
    expect(byAuthor.map((work) => work.id)).toEqual(
      byTitle.map((work) => work.id),
    );
  });

  it("projects work details with preferred/all editions and ordered relations", async () => {
    const [summary] = await repository.listWorkSummaries("Glass Harbors");
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
    const [summary] = await repository.listWorkSummaries("Empty Colophon");
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
});
