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
  console.info(
    "[seed:pg] env=%s inserted=%d (conflicts ignored)%s",
    vercelEnv,
    values.length,
    force ? " [forced]" : "",
  );
}

main().catch((e) => {
  // eslint-disable-next-line no-console
  console.error("[seed:pg] failed", e);
  process.exit(1);
});
