import { ensureDb } from "@/db/client";
import {
  createBookRow,
  deleteBookRow,
  getBook as getBookRow,
  listNewArrivals,
  listTopRated,
  listTrendingNow,
  updateBookRow,
} from "@/db/provider";
import type { Book } from "./types";

export async function findBookById(id: string): Promise<Book | undefined> {
  await ensureDb();
  return getBookRow(id);
}

export async function createBook(
  input: Omit<Book, "id"> & { id?: string },
): Promise<Book> {
  await ensureDb();
  return createBookRow(input);
}

export async function updateBook(
  id: string,
  patch: Partial<Omit<Book, "id">>,
): Promise<Book | undefined> {
  await ensureDb();
  return updateBookRow(id, patch);
}

export async function deleteBook(id: string): Promise<boolean> {
  await ensureDb();
  return deleteBookRow(id);
}

export async function getNewArrivals(limit = 24): Promise<Book[]> {
  await ensureDb();
  return listNewArrivals(limit);
}

export async function getTopRated(limit = 24, minCount = 10): Promise<Book[]> {
  await ensureDb();
  return listTopRated(limit, minCount);
}

export async function getTrendingNow(limit = 24): Promise<Book[]> {
  await ensureDb();
  return listTrendingNow(limit);
}
