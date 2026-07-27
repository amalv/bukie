import { readFileSync } from "node:fs";
import path from "node:path";
import { getTableConfig as getPgTableConfig } from "drizzle-orm/pg-core";
import { getTableConfig as getSqliteTableConfig } from "drizzle-orm/sqlite-core";
import { describe, expect, it } from "vitest";
import { catalogSqliteTables } from "./schema";
import { catalogPostgresTables } from "./schema.pg";

type ComparableConfig = {
  name: string;
  columns: Array<{ name: string; notNull: boolean; primary: boolean }>;
  indexes: Array<{
    name: string;
    unique: boolean;
    columns: string[];
    partial: boolean;
  }>;
  checks: string[];
  foreignKeyCount: number;
  primaryKeyCount: number;
};

function comparableSqlite(
  table: (typeof catalogSqliteTables)[keyof typeof catalogSqliteTables],
): ComparableConfig {
  const config = getSqliteTableConfig(table);
  return {
    name: config.name,
    columns: config.columns.map((column) => ({
      name: column.name,
      notNull: column.notNull,
      primary: column.primary,
    })),
    indexes: config.indexes.map((index) => ({
      name: index.config.name,
      unique: index.config.unique,
      columns: index.config.columns.map((column) =>
        "name" in column ? String(column.name) : "expression",
      ),
      partial: Boolean(index.config.where),
    })),
    checks: config.checks
      .map((check) => check.name)
      .filter((name) => !name.endsWith("_json_ck"))
      .sort(),
    foreignKeyCount: config.foreignKeys.length,
    primaryKeyCount: config.primaryKeys.length,
  };
}

function comparablePostgres(
  table: (typeof catalogPostgresTables)[keyof typeof catalogPostgresTables],
): ComparableConfig {
  const config = getPgTableConfig(table);
  return {
    name: config.name,
    columns: config.columns.map((column) => ({
      name: column.name,
      notNull: column.notNull,
      primary: column.primary,
    })),
    indexes: config.indexes.map((index) => ({
      name: index.config.name ?? "",
      unique: index.config.unique,
      columns: index.config.columns.map((column) =>
        "name" in column ? String(column.name) : "expression",
      ),
      partial: Boolean(index.config.where),
    })),
    checks: config.checks
      .map((check) => check.name)
      .filter((name) => !name.endsWith("_json_ck"))
      .sort(),
    foreignKeyCount: config.foreignKeys.length,
    primaryKeyCount: config.primaryKeys.length,
  };
}

describe("SQLite/Postgres normalized catalog schema parity", () => {
  it("defines the same logical tables, columns, constraints, and indexes", () => {
    expect(Object.keys(catalogPostgresTables)).toEqual(
      Object.keys(catalogSqliteTables),
    );
    for (const key of Object.keys(catalogSqliteTables) as Array<
      keyof typeof catalogSqliteTables
    >) {
      expect(
        comparablePostgres(
          catalogPostgresTables[
            key
          ] as (typeof catalogPostgresTables)[keyof typeof catalogPostgresTables],
        ),
      ).toEqual(
        comparableSqlite(
          catalogSqliteTables[
            key
          ] as (typeof catalogSqliteTables)[keyof typeof catalogSqliteTables],
        ),
      );
    }
  });

  it("keeps both additive migrations target-only", () => {
    const sqliteMigration = readFileSync(
      path.resolve("drizzle/0002_fine_bullseye.sql"),
      "utf8",
    );
    const postgresMigration = readFileSync(
      path.resolve("drizzle/pg/0004_spicy_jocasta.sql"),
      "utf8",
    );
    expect(sqliteMigration.match(/^CREATE TABLE/gm)).toHaveLength(21);
    expect(postgresMigration.match(/^CREATE TABLE/gm)).toHaveLength(21);
    for (const migration of [sqliteMigration, postgresMigration]) {
      expect(migration).not.toMatch(
        /(?:create|alter|drop|delete from)\s+(?:table\s+)?["`]?books["`]?/i,
      );
      expect(migration).not.toMatch(
        /(?:create|alter|drop|delete from)\s+(?:table\s+)?["`]?book_metrics["`]?/i,
      );
    }
  });

  it("uses forward-only guarded migrations for legacy runtime removal", () => {
    const sqliteMigration = readFileSync(
      path.resolve("drizzle/0003_concerned_vance_astro.sql"),
      "utf8",
    );
    const postgresMigration = readFileSync(
      path.resolve("drizzle/pg/0005_sour_pretty_boy.sql"),
      "utf8",
    );
    for (const migration of [sqliteMigration, postgresMigration]) {
      expect(migration).toContain("legacy_catalog");
      expect(migration).toContain("source_record_links");
      expect(migration).toMatch(/normalized catalog evidence is incomplete/i);
      expect(migration).toMatch(/drop table (?:if exists )?["`]?books/i);
      expect(migration).toMatch(/drop table (?:if exists )?["`]?book_metrics/i);
    }
  });
});
