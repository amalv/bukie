ALTER TABLE "books" ADD COLUMN "ratings_count" integer;--> statement-breakpoint
ALTER TABLE "books" ADD COLUMN "added_at" integer;--> statement-breakpoint
ALTER TABLE "books" ADD COLUMN "description" text;--> statement-breakpoint
ALTER TABLE "books" ADD COLUMN "pages" integer;--> statement-breakpoint
ALTER TABLE "books" ADD COLUMN "publisher" text;--> statement-breakpoint
ALTER TABLE "books" ADD COLUMN "isbn" text;--> statement-breakpoint

CREATE TABLE IF NOT EXISTS "book_metrics" (
  "book_id" text PRIMARY KEY NOT NULL,
  "views_all_time" integer,
  "views_7d" integer,
  "trending_score" real,
  "updated_at" integer
);