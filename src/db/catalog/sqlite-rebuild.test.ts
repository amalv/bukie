import { mkdtempSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import baseCatalog from "@/../artifacts/catalog";
import {
  buildCatalogImportGraph,
  legacyBooksToImportRecords,
} from "./importer";
import {
  catalogSqliteSnapshot,
  importCatalogGraphSqlite,
  openCatalogSqlite,
  rebuildCatalogSqlite,
} from "./sqlite-rebuild";

describe("SQLite normalized catalog rebuild", () => {
  const graph = buildCatalogImportGraph(
    legacyBooksToImportRecords(baseCatalog),
  );
  let testDirectory: string;
  let sqlitePath: string;

  beforeEach(() => {
    testDirectory = mkdtempSync(path.join(tmpdir(), "bukie-catalog-test-"));
    sqlitePath = path.join(testDirectory, "catalog-test.sqlite");
  });

  afterEach(() => {
    const resolved = path.resolve(testDirectory);
    expect(resolved.startsWith(path.resolve(tmpdir()))).toBe(true);
    rmSync(resolved, { recursive: true, force: true });
  });

  it("produces the same complete snapshot across two clean rebuilds", () => {
    const first = rebuildCatalogSqlite({ sqlitePath, graph });
    const second = rebuildCatalogSqlite({ sqlitePath, graph });
    expect(second.hash).toBe(first.hash);
    expect(second.tables.works).toHaveLength(500);
    expect(second.tables.editions).toHaveLength(500);
    expect(second.tables.cover_assets).toHaveLength(500);
    expect(second.tables.field_resolution_heads).toHaveLength(8012);
  }, 30_000);

  it("is retry-idempotent without a reset", () => {
    rebuildCatalogSqlite({ sqlitePath, graph });
    const { raw } = openCatalogSqlite(sqlitePath);
    try {
      const before = catalogSqliteSnapshot(raw);
      raw.transaction(() => importCatalogGraphSqlite(raw, graph)).immediate();
      const after = catalogSqliteSnapshot(raw);
      expect(after.hash).toBe(before.hash);
    } finally {
      raw.close();
    }
  }, 30_000);

  it("rolls back a forced midway importer failure without partial target data", () => {
    const before = rebuildCatalogSqlite({ sqlitePath, graph });
    expect(() =>
      rebuildCatalogSqlite({
        sqlitePath,
        graph,
        failAfterTable: "editions",
      }),
    ).toThrow("Forced catalog importer failure after editions");

    const { raw } = openCatalogSqlite(sqlitePath);
    try {
      expect(catalogSqliteSnapshot(raw).hash).toBe(before.hash);
    } finally {
      raw.close();
    }
  }, 30_000);

  it("creates a normalized database with no legacy runtime tables", () => {
    rebuildCatalogSqlite({ sqlitePath, graph });
    const { raw } = openCatalogSqlite(sqlitePath);
    try {
      expect(
        raw
          .prepare(
            `select name from sqlite_master
             where type = 'table' and name in ('books', 'book_metrics')`,
          )
          .all(),
      ).toEqual([]);
    } finally {
      raw.close();
    }
  }, 30_000);

  it("refuses the forward drop when normalized evidence is incomplete", () => {
    const { raw } = openCatalogSqlite(sqlitePath);
    try {
      for (const file of [
        "drizzle/0000_small_daredevil.sql",
        "drizzle/0001_charming_mariko_yashida.sql",
        "drizzle/0002_fine_bullseye.sql",
      ]) {
        const migration = readFileSync(path.resolve(file), "utf8");
        for (const statement of migration.split("--> statement-breakpoint")) {
          if (statement.trim()) raw.exec(statement);
        }
      }
      raw
        .prepare(
          "insert into books (id, title, author, cover) values (?, ?, ?, ?)",
        )
        .run(
          "legacy-sentinel",
          "Legacy Sentinel",
          "Test Author",
          "/covers/sentinel.webp",
        );
      const forward = readFileSync(
        path.resolve("drizzle/0003_concerned_vance_astro.sql"),
        "utf8",
      );
      expect(() => {
        for (const statement of forward.split("--> statement-breakpoint")) {
          if (statement.trim()) raw.exec(statement);
        }
      }).toThrow(/normalized catalog evidence is incomplete/);
      expect(
        raw
          .prepare("select title from books where id = 'legacy-sentinel'")
          .get(),
      ).toEqual({ title: "Legacy Sentinel" });
    } finally {
      raw.close();
    }
  }, 30_000);

  it("refuses the forward drop when source links target missing entities", () => {
    const { raw } = openCatalogSqlite(sqlitePath);
    try {
      for (const file of [
        "drizzle/0000_small_daredevil.sql",
        "drizzle/0001_charming_mariko_yashida.sql",
        "drizzle/0002_fine_bullseye.sql",
      ]) {
        const migration = readFileSync(path.resolve(file), "utf8");
        for (const statement of migration.split("--> statement-breakpoint")) {
          if (statement.trim()) raw.exec(statement);
        }
      }
      raw.exec(`
        insert into books (id, title, author, cover)
        values ('legacy-sentinel', 'Legacy Sentinel', 'Test Author', '/covers/sentinel.webp');

        insert into works (
          id, preferred_title, sort_title, created_at, updated_at
        ) values (
          'unrelated-work', 'Unrelated Work', 'unrelated work', 1, 1
        );

        insert into editions (
          id, work_id, cataloged_at, created_at, updated_at
        ) values (
          'unrelated-edition', 'unrelated-work', 1, 1, 1
        );

        insert into metadata_sources (
          id, key, name, approval_state, metadata_policy, asset_policy, payload_policy
        ) values (
          'legacy-source', 'legacy_catalog', 'Legacy Catalog', 'pending', '{}', '{}', 'none'
        );

        insert into source_records (
          id, source_id, record_key, retrieved_at, state
        ) values (
          'legacy-record', 'legacy-source', 'legacy-sentinel', 1, 'active'
        );

        insert into source_record_links (
          source_record_id, entity_type, entity_id, match_kind,
          mapping_confidence, state, created_at
        ) values
          (
            'legacy-record', 'work', 'missing-work', 'source_relationship',
            1, 'active', 1
          ),
          (
            'legacy-record', 'edition', 'missing-edition', 'source_relationship',
            1, 'active', 1
          );
      `);

      const forward = readFileSync(
        path.resolve("drizzle/0003_concerned_vance_astro.sql"),
        "utf8",
      );
      expect(() => {
        for (const statement of forward.split("--> statement-breakpoint")) {
          if (statement.trim()) raw.exec(statement);
        }
      }).toThrow(/normalized catalog evidence is incomplete/);
      expect(
        raw
          .prepare("select title from books where id = 'legacy-sentinel'")
          .get(),
      ).toEqual({ title: "Legacy Sentinel" });
    } finally {
      raw.close();
    }
  }, 30_000);

  it("enforces foreign keys, controlled values, and single-primary relationships", () => {
    rebuildCatalogSqlite({ sqlitePath, graph });
    const { raw } = openCatalogSqlite(sqlitePath);
    try {
      expect(raw.pragma("foreign_keys", { simple: true })).toBe(1);
      expect(() =>
        raw
          .prepare(
            `insert into editions (
                id, work_id, cataloged_at, created_at, updated_at
              ) values (?, ?, ?, ?, ?)`,
          )
          .run("invalid-edition", "missing-work", 1, 1, 1),
      ).toThrow(/FOREIGN KEY/);
      expect(() =>
        raw
          .prepare(
            `update metadata_sources
               set approval_state = 'unknown'
               where key = 'legacy_catalog'`,
          )
          .run(),
      ).toThrow(/CHECK constraint/);

      const primary = raw
        .prepare(
          "select work_id, category_id from work_categories where is_primary = 1 limit 1",
        )
        .get() as { work_id: string; category_id: string };
      const otherCategory = raw
        .prepare("select id from categories where id <> ? limit 1")
        .get(primary.category_id) as { id: string };
      expect(() =>
        raw
          .prepare(
            `insert into work_categories (
                work_id, category_id, position, is_primary
              ) values (?, ?, ?, 1)`,
          )
          .run(primary.work_id, otherCategory.id, 9),
      ).toThrow(/UNIQUE constraint/);
    } finally {
      raw.close();
    }
  }, 30_000);

  it("preserves deterministic projections, source hashes, synthetic policy, and query indexes", () => {
    rebuildCatalogSqlite({ sqlitePath, graph });
    const { raw } = openCatalogSqlite(sqlitePath);
    try {
      const projection = raw
        .prepare(
          `select
              count(distinct w.id) as works,
              count(distinct e.id) as editions,
              count(distinct ca.object_key) as covers
             from works w
             join editions e on e.work_id = w.id
             left join edition_covers ec on ec.edition_id = e.id and ec.is_primary = 1
             left join cover_assets ca on ca.id = ec.cover_asset_id`,
        )
        .get();
      expect(projection).toEqual({
        works: 500,
        editions: 500,
        covers: 500,
      });
      expect(
        raw
          .prepare(
            `select count(*) as count
               from field_observations
               where provenance_kind = 'synthetic'`,
          )
          .get(),
      ).toEqual({ count: 1200 });
      expect(
        raw
          .prepare(
            `select count(*) as count
               from field_resolution_heads
               where field_key in ('legacy.rating', 'legacy.ratings_count')`,
          )
          .get(),
      ).toEqual({ count: 0 });
      expect(
        raw
          .prepare(
            `select count(*) as count
               from source_records
               where importer_version is not null
                 and length(source_row_hash) = 64`,
          )
          .get(),
      ).toEqual({ count: 1000 });

      const workIndexes = raw
        .prepare("pragma index_list('works')")
        .all() as Array<{ name: string }>;
      expect(workIndexes.map((entry) => entry.name)).toEqual(
        expect.arrayContaining([
          "works_sort_title_id_idx",
          "works_preferred_edition_idx",
        ]),
      );
      const refreshIndexes = raw
        .prepare("pragma index_list('source_records')")
        .all() as Array<{ name: string }>;
      expect(refreshIndexes.map((entry) => entry.name)).toContain(
        "source_records_refresh_idx",
      );
    } finally {
      raw.close();
    }
  }, 30_000);
});
