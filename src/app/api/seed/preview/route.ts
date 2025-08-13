import { NextResponse } from "next/server";
import { books as mockBooks } from "@/../mocks/books";
import { getDb } from "@/db/client";
import { getDbEnv } from "@/db/env";

// Simple token protection to avoid accidental seeding
const TOKEN = process.env.SEED_TOKEN;

export async function POST() {
  if (!TOKEN) {
    return NextResponse.json(
      { error: "SEED_TOKEN is not set" },
      { status: 500 },
    );
  }
  const flag = (process.env as Record<string, string | undefined>)
    .NEXT_PUBLIC_PREVIEW_SEED;
  if (flag !== TOKEN) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const env = getDbEnv();
  if (env.driver !== "postgres") {
    return NextResponse.json(
      { error: "Seeding endpoint is for Postgres only" },
      { status: 400 },
    );
  }

  const { db, schema } = getDb();
  const values = mockBooks.map((b) => ({
    id: b.id,
    title: b.title,
    author: b.author,
    cover: b.cover,
  }));

  try {
    const CHUNK = 50;
    for (let i = 0; i < values.length; i += CHUNK) {
      const batch = values.slice(i, i + CHUNK);
      // On preview we may hit the route multiple times; ignore PK conflicts
      // @ts-expect-error drizzle type narrow
      await db.insert(schema.books).values(batch).onConflictDoNothing();
    }
    return NextResponse.json({ ok: true, inserted: values.length });
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 });
  }
}
