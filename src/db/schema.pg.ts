import type { InferInsertModel, InferSelectModel } from "drizzle-orm";
import { bigint, integer, pgTable, real, text } from "drizzle-orm/pg-core";

export const booksTablePg = pgTable("books", {
  id: text("id").primaryKey(),
  title: text("title").notNull(),
  author: text("author").notNull(),
  cover: text("cover").notNull(),
  genre: text("genre"),
  rating: real("rating"),
  year: integer("year"),
  ratingsCount: integer("ratings_count"),
  // store epoch milliseconds as bigint
  addedAt: bigint("added_at", { mode: "number" }),
  description: text("description"),
  pages: integer("pages"),
  publisher: text("publisher"),
  isbn: text("isbn"),
});

export type BookRowPg = InferSelectModel<typeof booksTablePg>;
export type NewBookRowPg = InferInsertModel<typeof booksTablePg>;

export const bookMetricsTablePg = pgTable("book_metrics", {
  bookId: text("book_id").primaryKey(),
  viewsAllTime: integer("views_all_time"),
  views7d: integer("views_7d"),
  trendingScore: real("trending_score"),
  // epoch milliseconds
  updatedAt: bigint("updated_at", { mode: "number" }),
});
