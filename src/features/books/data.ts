import { db, ensureDb } from "@/db/client";
import { booksTable } from "@/db/schema";
import type { Book } from "./types";

export async function getBooks(): Promise<Book[]> {
  await ensureDb();
  const rows = db.select().from(booksTable).all();
  return rows as Book[];
}
