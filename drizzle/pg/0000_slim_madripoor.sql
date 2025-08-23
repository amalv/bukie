CREATE SCHEMA IF NOT EXISTS drizzle;
CREATE TABLE "books" (
	"id" text PRIMARY KEY NOT NULL,
	"title" text NOT NULL,
	"author" text NOT NULL,
	"cover" text NOT NULL
);
