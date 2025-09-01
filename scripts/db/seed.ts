import { ensureDb } from "../../src/db/client";
import { books as mockBooks } from "../../mocks/books";
import { ingestBooks } from "../../src/db/ingest";

async function main() {
  await ensureDb();
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
  description: b.description ?? undefined,
  pages: b.pages ?? undefined,
  publisher: b.publisher ?? undefined,
  isbn: b.isbn ?? undefined,
  }));
  const res = await ingestBooks(books, { mode: "replace" });
  // eslint-disable-next-line no-console
  console.log("[db:seed] replace done:", res.processed, "items");
}

main().catch((e) => {
  // eslint-disable-next-line no-console
  console.error("[db:seed] failed", e);
  process.exit(1);
});
