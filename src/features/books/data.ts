import { ensureDb } from "@/db/client";
import { listBooks, searchBooks } from "@/db/provider";
import type { Book } from "./types";

export async function getBooks(q?: string): Promise<Book[]> {
  await ensureDb();
  if (q && q.trim().length > 0) return searchBooks(q);
  return listBooks();
}
