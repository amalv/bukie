import { getDbEnv } from "@/db/env";
import { getPgDb } from "@/db/pg";
import { books as mockBooks } from "@/../mocks/books";
import { booksTablePg } from "@/db/schema.pg";

async function main() {
  const env = getDbEnv();
  if (env.driver !== "postgres") {
    // eslint-disable-next-line no-console
    console.info("[seed:pg] skipping (driver=%s)", env.driver);
    return;
  }
  const db = getPgDb();

  // Idempotent upsert-ish: we ignore conflicts on id
  const values = mockBooks.map((b) => ({
    id: b.id,
    title: b.title,
    author: b.author,
    cover: b.cover,
    genre: b.genre,
    rating: b.rating,
    year: b.year,
  }));

  const CHUNK = 50;
  for (let i = 0; i < values.length; i += CHUNK) {
    const batch = values.slice(i, i + CHUNK);
    for (const row of batch) {
      await db.insert(booksTablePg).values(row).onConflictDoNothing();
    }
  }
  // eslint-disable-next-line no-console
  console.info("[seed:pg] inserted=%d (conflicts ignored)", values.length);
}

main().catch((e) => {
  // eslint-disable-next-line no-console
  console.error("[seed:pg] failed", e);
  process.exit(1);
});
