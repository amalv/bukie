ALTER TABLE `books` ADD `ratings_count` integer;--> statement-breakpoint
ALTER TABLE `books` ADD `added_at` integer;--> statement-breakpoint
ALTER TABLE `books` ADD `description` text;--> statement-breakpoint
ALTER TABLE `books` ADD `pages` integer;--> statement-breakpoint
ALTER TABLE `books` ADD `publisher` text;--> statement-breakpoint
ALTER TABLE `books` ADD `isbn` text;--> statement-breakpoint

CREATE TABLE IF NOT EXISTS `book_metrics` (
  `book_id` text PRIMARY KEY NOT NULL,
  `views_all_time` integer,
  `views_7d` integer,
  `trending_score` real,
  `updated_at` integer
);