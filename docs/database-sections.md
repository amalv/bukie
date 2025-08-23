# Database Schema and Section Logic

This document explains the database additions that power the homepage sections “New Arrivals”, “Top Rated”, and “Trending Now”. It complements `docs/database-architecture.md`.

## Tables

### books
We extended the existing `books` table with optional metadata and ranking hints.

- id (text, PK)
- title (text, required)
- author (text, required)
- cover (text, required)
- genre (text)
- rating (real) — average rating 0–5
- year (integer)
- ratings_count (integer) — how many ratings the average is based on
- added_at (integer) — epoch ms when the book was added to the catalog
- description (text)
- pages (integer)
- publisher (text)
- isbn (text)

### book_metrics
Lightweight, denormalized metrics useful for ranking “Trending Now” without user accounts.

- book_id (text, PK) — references `books.id`
- views_all_time (integer)
- views_7d (integer)
- trending_score (real) — precomputed score used for ordering
- updated_at (integer, epoch ms)

Migrations exist for both SQLite (`drizzle/*.sql`) and Postgres (`drizzle/pg/*.sql`). During local dev, the SQLite fallback creates both tables if migrations are not present.

## Business Logic

The section queries live in `src/db/provider.ts` and are exposed via `src/features/books/repo.ts`.

- New Arrivals
  - Order by `added_at` desc (fallback to `id` desc if null).
  - Limit N (default 24).

- Top Rated
  - Filter `ratings_count > minCount` (default 10) to avoid noisy low‑sample averages.
  - Order by `rating` desc, then `ratings_count` desc.

- Trending Now
  - Left join `book_metrics` and order by `trending_score` desc, with a secondary tie‑break on `id` desc.
  - The `seed` step populates a simple score derived from `rating * ratings_count / 100`. In production you could refresh this from real activity signals (views, saves, search clicks) via a cron or background worker.

## Seeding

Seeders (`scripts/db/seed.ts` and `scripts/db/seed.pg.ts`) now:

- Populate `ratings_count` with a realistic range and set `added_at` sequentially so New Arrivals looks natural.
- Create `book_metrics` with synthetic values and a basic `trending_score`.

## Incremental Adoption

- Existing UI continues to work; new fields are optional.
- If you later add real activity tracking, write to `book_metrics` periodically and the Trending section will immediately reflect it.
