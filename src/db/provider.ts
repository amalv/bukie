import { eq } from "drizzle-orm";
import type { Book } from "@/features/books/types";
import { db as sqliteDb } from "./client";
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
    const rows = await db.select().from(booksTablePg);
    return rows as Book[];
  }
  const rows = sqliteDb.select().from(booksSqlite).all();
  return rows as Book[];
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
  const row = sqliteDb
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
      })
      .returning();
    return created as Book;
  }
  sqliteDb
    .insert(booksSqlite)
    .values({
      id,
      title: input.title,
      author: input.author,
      cover: input.cover,
    })
    .run();
  const created = sqliteDb
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
  sqliteDb.update(booksSqlite).set(setters).where(eq(booksSqlite.id, id)).run();
  const updated = sqliteDb
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
  const result = sqliteDb
    .delete(booksSqlite)
    .where(eq(booksSqlite.id, id))
    .run() as unknown as { changes: number };
  return result.changes > 0;
}
