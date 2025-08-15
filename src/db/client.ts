import { existsSync, mkdirSync } from "node:fs";
import { join } from "node:path";
import Database from "better-sqlite3";
import { drizzle as drizzleSqlite } from "drizzle-orm/better-sqlite3";
import { migrate as migrateSqlite } from "drizzle-orm/better-sqlite3/migrator";
import { drizzle as drizzlePostgres } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import { books as mockBooks } from "../../mocks/books";
import { getDbEnv } from "./env";
import { booksTable } from "./schema";
import { booksTablePg } from "./schema.pg";

const DATA_DIR = join(process.cwd(), ".data");
const DB_PATH = join(DATA_DIR, "dev.sqlite");

function ensureDataDir() {
  if (!existsSync(DATA_DIR)) {
    mkdirSync(DATA_DIR, { recursive: true });
  }
}

let sqlite: InstanceType<typeof Database> | undefined;
let dbSqlite: ReturnType<typeof drizzleSqlite> | undefined;

function getSqliteDbInternal() {
  if (dbSqlite) return dbSqlite;
  ensureDataDir();
  sqlite = new Database(DB_PATH);
  dbSqlite = drizzleSqlite(sqlite);
  return dbSqlite;
}

export async function ensureDb(): Promise<void> {
  const env = getDbEnv();
  if (env.driver !== "sqlite") return; // only manage local sqlite

  // Run migrations (idempotent)
  try {
    migrateSqlite(getSqliteDbInternal(), { migrationsFolder: "drizzle" });
  } catch {
    // If no migrations folder yet, fall back to ensuring table exists
    const s = sqlite ?? new Database(DB_PATH);
    sqlite = s;
    s.exec(
      `CREATE TABLE IF NOT EXISTS books (
        id TEXT PRIMARY KEY,
        title TEXT NOT NULL,
        author TEXT NOT NULL,
        cover TEXT NOT NULL,
        genre TEXT,
        rating REAL,
        year INTEGER
      )`,
    );
  }

  // Seed if empty
  const sqliteDb = getSqliteDbInternal();
  const hasAny = sqliteDb
    .select({ id: booksTable.id })
    .from(booksTable)
    .limit(1)
    .all();
  if (hasAny.length === 0) {
    const insertValues = mockBooks.map((b) => ({
      id: b.id,
      title: b.title,
      author: b.author,
      cover: b.cover,
      genre: b.genre,
      rating: b.rating,
      year: b.year,
    }));
    const CHUNK = 25;
    for (let i = 0; i < insertValues.length; i += CHUNK) {
      const batch = insertValues.slice(i, i + CHUNK);
      // In parallel test runs, multiple workers may attempt to seed at once.
      // Make inserts idempotent by ignoring duplicates on the primary key.
      sqliteDb.insert(booksTable).values(batch).onConflictDoNothing().run();
    }
  }
}

// Factory that returns a Drizzle client for the active driver.
export function getDb() {
  const env = getDbEnv();
  const nodeEnv = process.env.NODE_ENV ?? "development";
  const vercelEnv = process.env.VERCEL_ENV; // development | preview | production
  const debug =
    process.env.DEBUG_DB === "1" ||
    nodeEnv === "development" ||
    vercelEnv === "preview";

  function describePgUrl(url: string): string {
    try {
      const u = new URL(url);
      // Identify pooled endpoint via host suffix and show db name
      const pooled = u.hostname.includes("-pooler");
      const host = u.hostname;
      const db = u.pathname.replace(/^\//, "");
      return `${host}/${db} (${pooled ? "pooled" : "unpooled"})`;
    } catch {
      return "<invalid-pg-url>";
    }
  }

  if (env.driver === "postgres") {
    if (!env.postgresUrl) {
      throw new Error(
        "DATABASE_URL/POSTGRES_URL must be set for postgres driver",
      );
    }
    // Use postgres-js (serverless-friendly). Allow overriding pool size via DB_POOL_MAX
    const max = Number(
      process.env.DB_POOL_MAX ?? (process.env.VERCEL ? "1" : "1"),
    );
    const sql = postgres(env.postgresUrl, { max });
    const dbPg = drizzlePostgres(sql);

    if (debug) {
      // eslint-disable-next-line no-console
      console.info(
        "[DB] driver=postgres env=%s vercel=%s target=%s",
        nodeEnv,
        vercelEnv ?? "-",
        describePgUrl(env.postgresUrl),
      );
    }

    return {
      kind: "postgres" as const,
      db: dbPg,
      schema: { books: booksTablePg },
    };
  }
  if (debug) {
    // eslint-disable-next-line no-console
    console.info("[DB] driver=sqlite env=%s path=%s", nodeEnv, DB_PATH);
  }
  return {
    kind: "sqlite" as const,
    db: getSqliteDbInternal(),
    schema: { books: booksTable },
  };
}

// Explicit getter for modules that need raw sqlite (e.g., provider)
export function getSqliteDb() {
  return getSqliteDbInternal();
}
