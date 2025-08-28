import { ensureDb } from "@/db/client";
import { provider } from "@/db/provider";
import type { PageResult } from "./pagination";
import type { Book } from "./types";

export async function getBooks(q?: string): Promise<Book[]> {
  await ensureDb();
  if (q && q.trim().length > 0) return provider.searchBooks(q);
  return provider.listBooks();
}

export async function getBooksPage(params: {
  q?: string;
  after?: string | null;
  limit?: number;
}): Promise<PageResult<Book>> {
  await ensureDb();
  const limit = params.limit ?? 20;
  if (params.q && params.q.trim().length > 0) {
    return provider.searchBooksPage({
      q: params.q,
      after: params.after,
      limit,
    });
  }
  return provider.listBooksPage({ after: params.after, limit });
}
