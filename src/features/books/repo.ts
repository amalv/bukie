import { eq } from "drizzle-orm";
import { db, ensureDb } from "@/db/client";
import { booksTable } from "@/db/schema";
import type { Book } from "./types";

export async function findBookById(id: string): Promise<Book | undefined> {
  await ensureDb();
  const row = db.select().from(booksTable).where(eq(booksTable.id, id)).get();
  return row as Book | undefined;
}

export async function createBook(
  input: Omit<Book, "id"> & { id?: string },
): Promise<Book> {
  await ensureDb();
  const id = input.id ?? String(Date.now());
  db.insert(booksTable)
    .values({
      id,
      title: input.title,
      author: input.author,
      cover: input.cover,
    })
    .run();
  const created = db
    .select()
    .from(booksTable)
    .where(eq(booksTable.id, id))
    .get();
  return created as Book;
}

export async function updateBook(
  id: string,
  patch: Partial<Omit<Book, "id">>,
): Promise<Book | undefined> {
  await ensureDb();
  const setters: Record<string, unknown> = {};
  if (patch.title !== undefined) setters.title = patch.title;
  if (patch.author !== undefined) setters.author = patch.author;
  if (patch.cover !== undefined) setters.cover = patch.cover;
  if (Object.keys(setters).length === 0) {
    const existing = db
      .select()
      .from(booksTable)
      .where(eq(booksTable.id, id))
      .get();
    return existing as Book | undefined;
  }
  db.update(booksTable).set(setters).where(eq(booksTable.id, id)).run();
  const updated = db
    .select()
    .from(booksTable)
    .where(eq(booksTable.id, id))
    .get();
  return updated as Book | undefined;
}

export async function deleteBook(id: string): Promise<boolean> {
  await ensureDb();
  const result = db
    .delete(booksTable)
    .where(eq(booksTable.id, id))
    .run() as unknown as {
    changes: number;
  };
  return result.changes > 0;
}
