import { ensureDb } from "@/db/client";
import {
  listBooks,
  listBooksPage,
  searchBooks,
  searchBooksPage,
} from "@/db/provider";
import type { PageResult } from "./pagination";
import type { Book } from "./types";

export async function getBooks(q?: string): Promise<Book[]> {
  await ensureDb();
  if (q && q.trim().length > 0) return searchBooks(q);
  return listBooks();
}

export async function getBooksPage(params: {
  q?: string;
  after?: string | null;
  limit?: number;
}): Promise<PageResult<Book>> {
  await ensureDb();
  const limit = params.limit ?? 20;
  if (params.q && params.q.trim().length > 0) {
    return searchBooksPage({ q: params.q, after: params.after, limit });
  }
  return listBooksPage({ after: params.after, limit });
}
