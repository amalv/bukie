import { existsSync, mkdirSync } from "node:fs";
import path from "node:path";
import Database from "better-sqlite3";
import { drizzle } from "drizzle-orm/better-sqlite3";
import { migrate } from "drizzle-orm/better-sqlite3/migrator";
import baseCatalog from "@/../artifacts/catalog";
import {
  buildCatalogImportGraph,
  legacyBooksToImportRecords,
} from "./catalog/importer";
import { importCatalogGraphSqlite } from "./catalog/sqlite-rebuild";
import { getDbEnv } from "./env";

let sqlite:
  | {
      path: string;
      raw: InstanceType<typeof Database>;
    }
  | undefined;
let initialization: Promise<void> | undefined;

function tableExists(raw: InstanceType<typeof Database>, table: string) {
  return Boolean(
    raw
      .prepare(
        "select 1 from sqlite_master where type = 'table' and name = ? limit 1",
      )
      .get(table),
  );
}

function countRows(raw: InstanceType<typeof Database>, table: string): number {
  if (!tableExists(raw, table)) return 0;
  const row = raw.prepare(`select count(*) as count from "${table}"`).get() as {
    count: number;
  };
  return Number(row.count);
}

function seedNormalizedCatalog(raw: InstanceType<typeof Database>): void {
  const seed = raw.transaction(() => {
    if (countRows(raw, "works") > 0) return;
    const graph = buildCatalogImportGraph(
      legacyBooksToImportRecords(baseCatalog),
    );
    importCatalogGraphSqlite(raw, graph);
  });
  seed.immediate();
}

export function getSqliteRaw(): InstanceType<typeof Database> {
  const sqlitePath = path.resolve(getDbEnv().sqlitePath);
  if (sqlite?.path === sqlitePath) return sqlite.raw;
  if (sqlite) {
    sqlite.raw.close();
    sqlite = undefined;
    initialization = undefined;
  }
  const directory = path.dirname(sqlitePath);
  if (!existsSync(directory)) mkdirSync(directory, { recursive: true });
  const raw = new Database(sqlitePath);
  raw.pragma("foreign_keys = ON");
  sqlite = { path: sqlitePath, raw };
  return raw;
}

/**
 * Initializes only the normalized catalog. Existing legacy rows are covered by
 * deterministic legacy_catalog source records before the forward drop
 * migration is allowed to run.
 */
export async function ensureDb(): Promise<void> {
  const env = getDbEnv();
  if (env.driver !== "sqlite") return;
  if (initialization) return initialization;
  initialization = Promise.resolve().then(() => {
    const raw = getSqliteRaw();
    if (
      tableExists(raw, "works") &&
      countRows(raw, "works") === 0 &&
      countRows(raw, "books") > 0
    ) {
      seedNormalizedCatalog(raw);
    }
    migrate(drizzle(raw), { migrationsFolder: "drizzle" });
    raw.pragma("foreign_keys = ON");
    seedNormalizedCatalog(raw);
  });
  return initialization;
}

export function closeSqlite(): void {
  sqlite?.raw.close();
  sqlite = undefined;
  initialization = undefined;
}
