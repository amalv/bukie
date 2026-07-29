import {
  cpSync,
  mkdtempSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import Database from "better-sqlite3";
import { drizzle } from "drizzle-orm/better-sqlite3";
import { migrate } from "drizzle-orm/better-sqlite3/migrator";
import { describe, expect, it } from "vitest";

describe("work first-publication SQLite migration", () => {
  it("adds nullable fields without inferring from an edition and preserves rollback safety", () => {
    const directory = mkdtempSync(
      path.join(tmpdir(), "bukie-work-date-migration-"),
    );
    const sqlitePath = path.join(directory, "catalog.sqlite");
    const oldMigrations = path.join(directory, "old-migrations");
    const raw = new Database(sqlitePath);
    try {
      cpSync(path.resolve("drizzle"), oldMigrations, { recursive: true });
      rmSync(path.join(oldMigrations, "0005_cuddly_bloodscream.sql"));
      rmSync(path.join(oldMigrations, "meta", "0005_snapshot.json"));
      const journalPath = path.join(oldMigrations, "meta", "_journal.json");
      const journal = JSON.parse(readFileSync(journalPath, "utf8")) as {
        entries: Array<{ idx: number }>;
      };
      journal.entries = journal.entries.filter((entry) => entry.idx < 5);
      writeFileSync(journalPath, JSON.stringify(journal, null, 2));

      migrate(drizzle(raw), { migrationsFolder: oldMigrations });
      raw
        .prepare(
          `insert into works (
             id, preferred_title, sort_title, description,
             preferred_edition_id, created_at, updated_at
           ) values ('work-migration', 'Migration Work', 'migration work',
                     null, null, 100, 100)`,
        )
        .run();
      raw
        .prepare(
          `insert into editions (
             id, work_id, title, subtitle, format, publication_date,
             publication_precision, publication_sort_date, pages,
             cataloged_at, created_at, updated_at
           ) values (
             'edition-migration', 'work-migration', null, null, null, '2020-07',
             'month', '2020-07-01', null, 100, 100, 100
           )`,
        )
        .run();
      raw
        .prepare(
          "update works set preferred_edition_id = 'edition-migration' where id = 'work-migration'",
        )
        .run();

      migrate(drizzle(raw), { migrationsFolder: path.resolve("drizzle") });
      expect(
        raw
          .prepare(
            `select first_publication_date as date,
                    first_publication_precision as precision,
                    first_publication_sort_date as sortDate
             from works where id = 'work-migration'`,
          )
          .get(),
      ).toEqual({ date: null, precision: null, sortDate: null });
      expect(
        raw
          .prepare(
            `select publication_date as date,
                    publication_precision as precision,
                    publication_sort_date as sortDate
             from editions where id = 'edition-migration'`,
          )
          .get(),
      ).toEqual({
        date: "2020-07",
        precision: "month",
        sortDate: "2020-07-01",
      });
      expect(raw.pragma("foreign_key_check")).toEqual([]);
      expect(() =>
        raw
          .prepare(
            `update works
             set first_publication_date = '1965',
                 first_publication_precision = null,
                 first_publication_sort_date = null
             where id = 'work-migration'`,
          )
          .run(),
      ).toThrow();
    } finally {
      raw.close();
      rmSync(directory, { recursive: true, force: true });
    }
  });

  it("uses nullable additions rather than an edition-data backfill", () => {
    const migration = readFileSync(
      path.resolve("drizzle/0005_cuddly_bloodscream.sql"),
      "utf8",
    );
    expect(migration).toContain(
      "ALTER TABLE `works` ADD `first_publication_date` text",
    );
    expect(migration).not.toContain("FROM `editions`");
    expect(migration).not.toMatch(/UPDATE `?works`?[\s\S]*first_publication/i);
  });
});
