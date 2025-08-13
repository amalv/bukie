import { ensureDb } from "@/db/client";
import {
  createBookRow,
  deleteBookRow,
  getBook as getBookRow,
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
