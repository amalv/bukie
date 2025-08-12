import { eq } from "drizzle-orm";
import { db, ensureDb } from "@/db/client";
import { booksTable } from "@/db/schema";
import type { Book } from "./types";

export async function findBookById(id: string): Promise<Book | undefined> {
  await ensureDb();
  const row = db.select().from(booksTable).where(eq(booksTable.id, id)).get();
  return row as Book | undefined;
}
