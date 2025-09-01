import { ensureDb } from "@/db/client";
import {
  type IngestItem,
  type IngestMode,
  type IngestReport,
  ingestBooks,
} from "@/db/ingest";
import { provider } from "@/db/provider";
import type { Book } from "./types";

export async function findBookById(id: string): Promise<Book | undefined> {
  await ensureDb();
  return provider.getBook(id);
}

export async function createBook(
  input: Omit<Book, "id"> & { id?: string },
): Promise<Book> {
  await ensureDb();
  return provider.createBookRow(input);
}

export async function updateBook(
  id: string,
  patch: Partial<Omit<Book, "id">>,
): Promise<Book | undefined> {
  await ensureDb();
  return provider.updateBookRow(id, patch);
}

export async function deleteBook(id: string): Promise<boolean> {
  await ensureDb();
  return provider.deleteBookRow(id);
}

export async function getNewArrivals(limit = 24): Promise<Book[]> {
  await ensureDb();
  return provider.listNewArrivals(limit);
}

export async function getTopRated(limit = 24, minCount = 10): Promise<Book[]> {
  await ensureDb();
  return provider.listTopRated(limit, minCount);
}

export async function getTrendingNow(limit = 24): Promise<Book[]> {
  await ensureDb();
  return provider.listTrendingNow(limit);
}

// Shared ingest from repo (server-side entry)
export async function ingest(
  items: IngestItem[],
  opts: { mode: IngestMode; dryRun?: boolean },
): Promise<IngestReport> {
  await ensureDb();
  return ingestBooks(items, opts);
}
