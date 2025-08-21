import { and, desc, eq, ilike, like, lt, or } from "drizzle-orm";
import {
  decodeCursor,
  encodeCursor,
  type PageResult,
} from "@/features/books/pagination";
import type { Book } from "@/features/books/types";
import { getSqliteDb } from "./client";
import { getDbEnv } from "./env";
import { getPgDb } from "./pg";
import { booksTable as booksSqlite } from "./schema";
import { booksTablePg } from "./schema.pg";

function getPgClient() {
  return getPgDb();
}

export async function listBooks(): Promise<Book[]> {
  const env = getDbEnv();
  if (env.driver === "postgres") {
    const db = getPgClient();
    const rows = await db
      .select()
      .from(booksTablePg)
      .orderBy(desc(booksTablePg.id));
    return rows as Book[];
  }
  const rows = getSqliteDb()
    .select()
    .from(booksSqlite)
    .orderBy(desc(booksSqlite.id))
    .all();
  return rows as Book[];
}

/**
 * Search books by title OR author (case-insensitive best-effort across providers).
 */
export async function searchBooks(query: string): Promise<Book[]> {
  const q = query.trim();
  if (!q) return listBooks();
  const env = getDbEnv();
  if (env.driver === "postgres") {
    const db = getPgClient();
    const rows = await db
      .select()
      .from(booksTablePg)
      .where(
        or(
          ilike(booksTablePg.title, `%${q}%`),
          ilike(booksTablePg.author, `%${q}%`),
        ),
      )
      .orderBy(desc(booksTablePg.id));
    return rows as Book[];
  }
  // SQLite LIKE is case-insensitive for ASCII by default; good enough for our sample data.
  const rows = getSqliteDb()
    .select()
    .from(booksSqlite)
    .where(
      or(like(booksSqlite.title, `%${q}%`), like(booksSqlite.author, `%${q}%`)),
    )
    .orderBy(desc(booksSqlite.id))
    .all();
  return rows as Book[];
}

export async function listBooksPage(params: {
  after?: string | null;
  limit: number;
}): Promise<PageResult<Book>> {
  const { after, limit } = params;
  const cursor = decodeCursor(after);
  const env = getDbEnv();
  const pageSize = Math.max(1, Math.min(50, limit));
  if (env.driver === "postgres") {
    const db = getPgClient();
    let rows: unknown[];
    if (cursor) {
      rows = await db
        .select()
        .from(booksTablePg)
        .where(lt(booksTablePg.id, cursor.id))
        .orderBy(desc(booksTablePg.id))
        .limit(pageSize + 1);
    } else {
      rows = await db
        .select()
        .from(booksTablePg)
        .orderBy(desc(booksTablePg.id))
        .limit(pageSize + 1);
    }
    const items = (rows as Book[]).slice(0, pageSize);
    const hasNext = rows.length > pageSize;
    const last = items[items.length - 1];
    const nextCursor =
      hasNext && last ? encodeCursor({ id: last.id }) : undefined;
    return { items, hasNext, nextCursor };
  }
  const db = getSqliteDb();
  let rows: unknown[];
  if (cursor) {
    rows = db
      .select()
      .from(booksSqlite)
      .where(lt(booksSqlite.id, cursor.id))
      .orderBy(desc(booksSqlite.id))
      .limit(pageSize + 1)
      .all();
  } else {
    rows = db
      .select()
      .from(booksSqlite)
      .orderBy(desc(booksSqlite.id))
      .limit(pageSize + 1)
      .all();
  }
  const items = (rows as Book[]).slice(0, pageSize);
  const hasNext = rows.length > pageSize;
  const last = items[items.length - 1];
  const nextCursor =
    hasNext && last ? encodeCursor({ id: last.id }) : undefined;
  return { items, hasNext, nextCursor };
}

export async function searchBooksPage(params: {
  q: string;
  after?: string | null;
  limit: number;
}): Promise<PageResult<Book>> {
  const { q: query, after, limit } = params;
  const q = query.trim();
  if (!q) return listBooksPage({ after, limit });
  const cursor = decodeCursor(after);
  const env = getDbEnv();
  const pageSize = Math.max(1, Math.min(50, limit));
  if (env.driver === "postgres") {
    const db = getPgClient();
    const searchCond = or(
      ilike(booksTablePg.title, `%${q}%`),
      ilike(booksTablePg.author, `%${q}%`),
    );
    const whereCond = cursor
      ? and(searchCond, lt(booksTablePg.id, cursor.id))
      : searchCond;
    const rows = await db
      .select()
      .from(booksTablePg)
      .where(whereCond)
      .orderBy(desc(booksTablePg.id))
      .limit(pageSize + 1);
    const items = (rows as Book[]).slice(0, pageSize);
    const hasNext = rows.length > pageSize;
    const last = items[items.length - 1];
    const nextCursor =
      hasNext && last ? encodeCursor({ id: last.id }) : undefined;
    return { items, hasNext, nextCursor };
  }
  // SQLite
  const dbLite = getSqliteDb();
  let rowsLite: unknown[];
  const whereBase = or(
    like(booksSqlite.title, `%${q}%`),
    like(booksSqlite.author, `%${q}%`),
  );
  if (cursor) {
    rowsLite = dbLite
      .select()
      .from(booksSqlite)
      .where(and(whereBase, lt(booksSqlite.id, cursor.id)))
      .orderBy(desc(booksSqlite.id))
      .limit(pageSize + 1)
      .all();
  } else {
    rowsLite = dbLite
      .select()
      .from(booksSqlite)
      .where(whereBase)
      .orderBy(desc(booksSqlite.id))
      .limit(pageSize + 1)
      .all();
  }
  const items = (rowsLite as Book[]).slice(0, pageSize);
  const hasNext = rowsLite.length > pageSize;
  const lastLite = items[items.length - 1];
  const nextCursor =
    hasNext && lastLite ? encodeCursor({ id: lastLite.id }) : undefined;
  return { items, hasNext, nextCursor };
}

export async function getBook(id: string): Promise<Book | undefined> {
  const env = getDbEnv();
  if (env.driver === "postgres") {
    const db = getPgClient();
    const rows = await db
      .select()
      .from(booksTablePg)
      .where(eq(booksTablePg.id, id))
      .limit(1);
    return rows[0] as Book | undefined;
  }
  const row = getSqliteDb()
    .select()
    .from(booksSqlite)
    .where(eq(booksSqlite.id, id))
    .get();
  return row as Book | undefined;
}

export async function createBookRow(
  input: Omit<Book, "id"> & { id?: string },
): Promise<Book> {
  const env = getDbEnv();
  const id = input.id ?? String(Date.now());
  if (env.driver === "postgres") {
    const db = getPgClient();
    const [created] = await db
      .insert(booksTablePg)
      .values({
        id,
        title: input.title,
        author: input.author,
        cover: input.cover,
        genre: input.genre,
        rating: input.rating as number | null | undefined,
        year: input.year as number | null | undefined,
      })
      .returning();
    return created as Book;
  }
  getSqliteDb()
    .insert(booksSqlite)
    .values({
      id,
      title: input.title,
      author: input.author,
      cover: input.cover,
      genre: input.genre,
      rating: input.rating as number | null | undefined,
      year: input.year as number | null | undefined,
    })
    .run();
  const created = getSqliteDb()
    .select()
    .from(booksSqlite)
    .where(eq(booksSqlite.id, id))
    .get();
  return created as Book;
}

export async function updateBookRow(
  id: string,
  patch: Partial<Omit<Book, "id">>,
): Promise<Book | undefined> {
  const env = getDbEnv();
  const setters: Record<string, unknown> = {};
  if (patch.title !== undefined) setters.title = patch.title;
  if (patch.author !== undefined) setters.author = patch.author;
  if (patch.cover !== undefined) setters.cover = patch.cover;
  if (patch.genre !== undefined) setters.genre = patch.genre;
  if (patch.rating !== undefined) setters.rating = patch.rating;
  if (patch.year !== undefined) setters.year = patch.year;
  if (Object.keys(setters).length === 0) return getBook(id);

  if (env.driver === "postgres") {
    const db = getPgClient();
    const [updated] = await db
      .update(booksTablePg)
      .set(setters)
      .where(eq(booksTablePg.id, id))
      .returning();
    return updated as Book | undefined;
  }
  getSqliteDb()
    .update(booksSqlite)
    .set(setters)
    .where(eq(booksSqlite.id, id))
    .run();
  const updated = getSqliteDb()
    .select()
    .from(booksSqlite)
    .where(eq(booksSqlite.id, id))
    .get();
  return updated as Book | undefined;
}

export async function deleteBookRow(id: string): Promise<boolean> {
  const env = getDbEnv();
  if (env.driver === "postgres") {
    const db = getPgClient();
    const deleted = await db
      .delete(booksTablePg)
      .where(eq(booksTablePg.id, id))
      .returning({ id: booksTablePg.id });
    return deleted.length > 0;
  }
  const result = getSqliteDb()
    .delete(booksSqlite)
    .where(eq(booksSqlite.id, id))
    .run() as unknown as { changes: number };
  return result.changes > 0;
}
