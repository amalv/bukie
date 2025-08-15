import { NextResponse } from "next/server";
import { books as mockBooks } from "@/../mocks/books";
import { getDbEnv } from "@/db/env";
import { getPgDb } from "@/db/pg";
import { booksTablePg } from "@/db/schema.pg";

function getBearerToken(req: Request): string | undefined {
  const auth =
    req.headers.get("authorization") || req.headers.get("Authorization");
  if (!auth) return undefined;
  const m = auth.match(/^Bearer\s+(.+)$/i);
  return m?.[1];
}

export async function POST(req: Request) {
  const token = getBearerToken(req);
  const expected = process.env.SEED_TOKEN;
  if (!expected) {
    return NextResponse.json(
      { error: "SEED_TOKEN is not set" },
      { status: 500 },
    );
  }
  if (!token || token !== expected) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const env = getDbEnv();
  if (env.driver !== "postgres") {
    return NextResponse.json(
      { error: "Seeding endpoint is for Postgres only" },
      { status: 400 },
    );
  }

  const url = new URL(req.url);
  const reset = url.searchParams.get("reset") === "1";

  const db = getPgDb();

  try {
    if (reset) {
      await db.delete(booksTablePg);
    }

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
    let inserted = 0;
    for (let i = 0; i < values.length; i += CHUNK) {
      const batch = values.slice(i, i + CHUNK);
      await db
        .insert(booksTablePg)
        .values(batch)
        // @ts-expect-error drizzle type narrow on pg
        .onConflictDoNothing();
      inserted += batch.length;
    }

    return NextResponse.json({ ok: true, inserted, reset });
  } catch (e) {
    // eslint-disable-next-line no-console
    console.error("[/api/admin/seed] failed", e);
    return NextResponse.json({ error: String(e) }, { status: 500 });
  }
}
