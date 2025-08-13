import type { InferInsertModel, InferSelectModel } from "drizzle-orm";
import { pgTable, text } from "drizzle-orm/pg-core";

export const booksTablePg = pgTable("books", {
  id: text("id").primaryKey(),
  title: text("title").notNull(),
  author: text("author").notNull(),
  cover: text("cover").notNull(),
});

export type BookRowPg = InferSelectModel<typeof booksTablePg>;
export type NewBookRowPg = InferInsertModel<typeof booksTablePg>;
