import { existsSync, mkdirSync } from "node:fs";
import { join } from "node:path";
import { Database } from "bun:sqlite";
import { books as mockBooks } from "../../mocks/books";

const DATA_DIR = join(process.cwd(), ".data");
const DB_PATH = join(DATA_DIR, "dev.sqlite");

if (!existsSync(DATA_DIR)) mkdirSync(DATA_DIR, { recursive: true });

const db = new Database(DB_PATH, { create: true });

db.run(
  `CREATE TABLE IF NOT EXISTS books (
    id TEXT PRIMARY KEY,
    title TEXT NOT NULL,
    author TEXT NOT NULL,
  cover TEXT NOT NULL,
  genre TEXT,
  rating REAL,
  year INTEGER
  )`
);

// Clean slate to ensure exact dataset
db.run("DELETE FROM books");

const books = mockBooks.map((b) => ({
  id: b.id,
  title: b.title,
  author: b.author,
  cover: b.cover,
  genre: b.genre,
  rating: b.rating,
  year: b.year,
}));

const insert = db.prepare(
  "INSERT INTO books (id, title, author, cover, genre, rating, year) VALUES (?, ?, ?, ?, ?, ?, ?)"
);
const tx = db.transaction((rows: typeof books) => {
  for (const r of rows)
    insert.run(
      r.id,
      r.title,
      r.author,
      r.cover,
      r.genre ?? null,
      r.rating ?? null,
      r.year ?? null,
    );
});

tx(books);
console.log(`[db:seed] inserted ${books.length} books into ${DB_PATH}`);
