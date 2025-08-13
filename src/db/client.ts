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

ensureDataDir();

const sqlite = new Database(DB_PATH);
export const db = drizzleSqlite(sqlite);

export async function ensureDb(): Promise<void> {
  const env = getDbEnv();
  if (env.driver !== "sqlite") return; // only manage local sqlite

  // Run migrations (idempotent)
  try {
    migrateSqlite(db, { migrationsFolder: "drizzle" });
  } catch {
    // If no migrations folder yet, fall back to ensuring table exists
    sqlite.exec(
      `CREATE TABLE IF NOT EXISTS books (
        id TEXT PRIMARY KEY,
        title TEXT NOT NULL,
        author TEXT NOT NULL,
        cover TEXT NOT NULL
      )`,
    );
  }

  // Seed if empty
  const hasAny = db
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
    }));
    const CHUNK = 25;
    for (let i = 0; i < insertValues.length; i += CHUNK) {
      const batch = insertValues.slice(i, i + CHUNK);
      // In parallel test runs, multiple workers may attempt to seed at once.
      // Make inserts idempotent by ignoring duplicates on the primary key.
      db.insert(booksTable).values(batch).onConflictDoNothing().run();
    }
  }
}

// Factory that returns a Drizzle client for the active driver.
export function getDb() {
  const env = getDbEnv();
  if (env.driver === "postgres") {
    if (!env.postgresUrl) {
      throw new Error(
        "DATABASE_URL/POSTGRES_URL must be set for postgres driver",
      );
    }
    // Use postgres-js (serverless-friendly) driver
    const sql = postgres(env.postgresUrl, { max: 1 });
    const dbPg = drizzlePostgres(sql);

    return {
      kind: "postgres" as const,
      db: dbPg,
      schema: { books: booksTablePg },
    };
  }
  return { kind: "sqlite" as const, db, schema: { books: booksTable } };
}
