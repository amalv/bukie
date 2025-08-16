import type { InferInsertModel, InferSelectModel } from "drizzle-orm";
import { integer, real, sqliteTable, text } from "drizzle-orm/sqlite-core";

export const booksTable = sqliteTable("books", {
  id: text("id").primaryKey(),
  title: text("title").notNull(),
  author: text("author").notNull(),
  cover: text("cover").notNull(),
  genre: text("genre"),
  rating: real("rating"),
  year: integer("year"),
});

export type BookRow = InferSelectModel<typeof booksTable>;
export type NewBookRow = InferInsertModel<typeof booksTable>;
