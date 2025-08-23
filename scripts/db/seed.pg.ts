import { getDbEnv } from "@/db/env";
import { closePg, getPgDb } from "@/db/pg";
import { books as mockBooks } from "@/../mocks/books";
import { bookMetricsTablePg, booksTablePg } from "@/db/schema.pg";

async function main() {
  const env = getDbEnv();
  if (env.driver !== "postgres") {
    // eslint-disable-next-line no-console
    console.info("[seed:pg] skipping (driver=%s)", env.driver);
    return;
  }
  const db = getPgDb();
  const vercelEnv = process.env.VERCEL_ENV ?? "-"; // preview | production | development/-
  const force = process.env.SEED_ON_BUILD === "1";

  // In production, avoid reseeding unless forced or empty.
  if (vercelEnv === "production" && !force) {
    const rows = await db
      .select({ id: booksTablePg.id })
      .from(booksTablePg)
      .limit(1);
    if (rows.length > 0) {
      // eslint-disable-next-line no-console
      console.info("[seed:pg] skipping (production and table not empty)");
      return;
    }
  }

  // In preview, reset the table so seeds reflect the latest mock data
  if (vercelEnv === "preview") {
    await db.delete(booksTablePg);
  }

  // Idempotent upsert-ish: we ignore conflicts on id (prod empty or preview after reset)
  const now = Date.now();
  const values = mockBooks.map((b, i) => ({
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

  const CHUNK = 50;
  for (let i = 0; i < values.length; i += CHUNK) {
    const batch = values.slice(i, i + CHUNK);
    for (const row of batch) {
      await db.insert(booksTablePg).values(row).onConflictDoNothing();
      // basic metrics rows
      const score = Math.round((row.rating ?? 0) * (row.ratingsCount ?? 0));
      await db
        .insert(bookMetricsTablePg)
        .values({
          bookId: row.id,
          viewsAllTime: (row.ratingsCount ?? 0) * 10,
          views7d: Math.floor(((row.ratingsCount ?? 0) * 10) / 12),
          trendingScore: Math.max(0, score / 100),
          updatedAt: now,
        })
        .onConflictDoNothing();
    }
  }
  // eslint-disable-next-line no-console
  console.info(
    "[seed:pg] env=%s inserted=%d (conflicts ignored)%s",
    vercelEnv,
    values.length,
    force ? " [forced]" : "",
  );
}

main()
  .then(async () => {
    // Ensure Postgres connections are closed so the process can exit cleanly
    await closePg().catch(() => {});
    process.exit(0);
  })
  .catch(async (e) => {
    // eslint-disable-next-line no-console
    console.error("[seed:pg] failed", e);
    await closePg().catch(() => {});
    process.exit(1);
  });
