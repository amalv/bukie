import { existsSync, mkdirSync } from "node:fs";
import { join } from "node:path";
import { Database } from "bun:sqlite";

const DATA_DIR = join(process.cwd(), ".data");
const DB_PATH = join(DATA_DIR, "dev.sqlite");

if (!existsSync(DATA_DIR)) mkdirSync(DATA_DIR, { recursive: true });

const db = new Database(DB_PATH, { create: true });

db.run(
  `CREATE TABLE IF NOT EXISTS books (
    id TEXT PRIMARY KEY,
    title TEXT NOT NULL,
    author TEXT NOT NULL,
    cover TEXT NOT NULL
  )`
);

const row = db.query("SELECT COUNT(*) as c FROM books").get() as { c: number } | undefined;
const count = row ? Number((row as any).c) : 0;
if (count > 0) {
  console.log("[db:seed] books already present, skipping");
  process.exit(0);
}

const books = Array.from({ length: 50 }, (_, i) => ({
  id: String(i + 1),
  title: `Book Title ${i + 1}`,
  author: `Author ${i + 1}`,
  cover: `https://placehold.co/120x180.png?text=${encodeURIComponent("Book "+(i+1))}`,
}));

const insert = db.prepare(
  "INSERT INTO books (id, title, author, cover) VALUES (?, ?, ?, ?)"
);
const tx = db.transaction((rows: typeof books) => {
  for (const r of rows) insert.run(r.id, r.title, r.author, r.cover);
});

tx(books);
console.log(`[db:seed] inserted ${books.length} books into ${DB_PATH}`);
