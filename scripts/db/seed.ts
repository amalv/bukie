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
    year INTEGER,
    ratings_count INTEGER,
    added_at INTEGER,
    description TEXT,
    pages INTEGER,
    publisher TEXT,
    isbn TEXT
  )`
);

// Clean slate to ensure exact dataset
db.run("DELETE FROM books");

const now = Date.now();
const books = mockBooks.map((b, i) => ({
  id: b.id,
  title: b.title,
  author: b.author,
  cover: b.cover,
  genre: b.genre,
  rating: b.rating,
  year: b.year,
  ratingsCount: b.ratingsCount ?? Math.floor(100 + Math.random() * 900),
  addedAt: b.addedAt ?? now - i * 86_400_000,
  description: b.description ?? null,
  pages: b.pages ?? null,
  publisher: b.publisher ?? null,
  isbn: b.isbn ?? null,
}));

const insert = db.prepare(
  "INSERT INTO books (id, title, author, cover, genre, rating, year, ratings_count, added_at, description, pages, publisher, isbn) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)"
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
  r.ratingsCount ?? null,
  r.addedAt ?? null,
  r.description ?? null,
  r.pages ?? null,
  r.publisher ?? null,
  r.isbn ?? null,
    );
});

tx(books);
console.log(`[db:seed] inserted ${books.length} books into ${DB_PATH}`);
