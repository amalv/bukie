ALTER TABLE "books" ALTER COLUMN "added_at" TYPE bigint USING "added_at"::bigint;
ALTER TABLE "book_metrics" ALTER COLUMN "updated_at" TYPE bigint USING "updated_at"::bigint;