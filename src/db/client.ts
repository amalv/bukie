import { existsSync, mkdirSync } from "node:fs";
import { join } from "node:path";
import Database from "better-sqlite3";
import { drizzle } from "drizzle-orm/better-sqlite3";
import { migrate } from "drizzle-orm/better-sqlite3/migrator";
import { books as mockBooks } from "../../mocks/books";
import { booksTable } from "./schema";

const DATA_DIR = join(process.cwd(), ".data");
const DB_PATH = join(DATA_DIR, "dev.sqlite");

function ensureDataDir() {
  if (!existsSync(DATA_DIR)) {
    mkdirSync(DATA_DIR, { recursive: true });
  }
}

ensureDataDir();

const sqlite = new Database(DB_PATH);
export const db = drizzle(sqlite);

export async function ensureDb(): Promise<void> {
  // Run migrations (idempotent)
  try {
    migrate(db, { migrationsFolder: "drizzle" });
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
      db.insert(booksTable).values(batch).run();
    }
  }
}
