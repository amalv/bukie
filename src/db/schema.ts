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
  // Number of ratings/reviews available for ranking; default 0
  ratingsCount: integer("ratings_count"),
  // Unix epoch milliseconds for when the book was added to catalog
  addedAt: integer("added_at"),
  // Optional extended metadata
  description: text("description"),
  pages: integer("pages"),
  publisher: text("publisher"),
  isbn: text("isbn"),
});

export type BookRow = InferSelectModel<typeof booksTable>;
export type NewBookRow = InferInsertModel<typeof booksTable>;

// Lightweight metrics to support Trending and analytics without user auth
export const bookMetricsTable = sqliteTable("book_metrics", {
  // same id as books.id
  bookId: text("book_id").primaryKey(),
  viewsAllTime: integer("views_all_time"),
  views7d: integer("views_7d"),
  trendingScore: real("trending_score"),
  updatedAt: integer("updated_at"), // epoch ms
});
