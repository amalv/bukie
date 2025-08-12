import { books } from "../../../mocks/books";
import type { Book } from "./types";

export async function getBooks(): Promise<Book[]> {
  // Simulate async in case we later fetch from DB/API
  return books;
}
