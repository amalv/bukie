import { ensureDb } from "@/db/client";
import { listBooks } from "@/db/provider";
import type { Book } from "./types";

export async function getBooks(): Promise<Book[]> {
  await ensureDb();
  return listBooks();
}
