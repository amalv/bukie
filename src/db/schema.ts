import type { InferInsertModel, InferSelectModel } from "drizzle-orm";
import { sqliteTable, text } from "drizzle-orm/sqlite-core";

export const booksTable = sqliteTable("books", {
  id: text("id").primaryKey(),
  title: text("title").notNull(),
  author: text("author").notNull(),
  cover: text("cover").notNull(),
});

export type BookRow = InferSelectModel<typeof booksTable>;
export type NewBookRow = InferInsertModel<typeof booksTable>;
