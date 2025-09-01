# Book curation and import — 100-book batches

This guide describes how we’ll curate and ingest books in batches of 100 so every record is production‑ready. It reuses existing scripts in `scripts/` and the package scripts in `package.json`.

## Goals

- Ingest 100 books per batch (configurable) with accurate metadata (title, authors, ISBNs, publisher, date, language, pages, description, categories, cover).
- Ratings and reviews can be mocked temporarily; provenance should be marked as mocked.
- Keep images optimized and DB references in sync.

## Prerequisites

- Bun installed. On Windows, prefer Node/tsx runners when noted.
- Local dev DB: SQLite auto‑created by scripts. Preview/Prod: Postgres (Neon) via `DATABASE_URL`.
- See also: `docs/database-architecture.md` and `docs/database-sections.md`.

## What we already have (reusable scripts)

- Covers
  - `covers:fetch` (Bun) / `covers:fetch:node` (Node/tsx, Windows‑friendly) — downloads covers and updates `books.cover`.
  - `images:optimize` — converts/optimizes cover assets (e.g., WebP) under `public/covers`.
  - `db:sync:covers` — syncs DB cover paths to slugged filenames based on files present.
- Database lifecycle
  - `db:migrate:pg` / `db:init:pg` — Postgres migrations/initialization for preview/prod.
  - `db:seed` (SQLite) / `db:seed:pg` (Postgres) — seeders using `mocks/books.ts`.
  - `db:reset` / `db:reseed` — utility for local dev.
  - `db:list` — quick listing for verification.

See all script entries in `package.json`.

## Batch workflow (per 100 books)

1) Prepare curated data
   - Ensure each book has accurate: title, authors (ordered), ISBN‑10/13 (validated), publisher, published date (YYYY or YYYY‑MM‑DD), language, pages, description, categories/genres, and a reliable identifier for cover lookup (prefer ISBN).
   - Temporary: ratingsCount, reviewsCount, averageRating may be mocked.
   - Current dev source of truth is `mocks/books.ts` (typed). Keep it up to date for batches of up to 100.

2) Import curated batch (from typed mocks)
   - Importer processes `mocks/books.ts`.
      - Dry-run to validate without writing (default upsert mode):

          ```powershell
          bun run db:import -- --batch-size=100 --dry-run
          ```

         - Execute and emit a report file (choose mode: upsert | replace):

          ```powershell
          bun run db:import -- --batch-size=100 --mode=upsert --report=./artifacts/report-YYYY-MM-DD.json
          ```

       - Generate a short Markdown summary:

          ```powershell
          bun run db:report -- --report=./artifacts/report-YYYY-MM-DD.json --out=./artifacts/report-YYYY-MM-DD.md --max=20
          ```

   Seed from mocks (SQLite replace):

    ```powershell
    bun run db:seed
    ```

   For Postgres (preview/prod, upsert; preview resets first):

    ```powershell
    bun run db:migrate:pg
    bun run db:seed:pg
    ```

3) Fetch covers for the new books
   - Prefer the Node/tsx runner on Windows to avoid Bun crashes (see guide):

     ```powershell
     # Process first 100 eligible (placeholders) with low concurrency
     bun run covers:fetch:node -- --limit=100 --concurrency=2 --no-optimize
     ```

   - You can also target specific ids with `--id=<bookId>` and enable `--seo-filenames` once titles are final.

4) Optimize images (optional for dev, recommended for preview/prod)

   ```powershell
   bun run images:optimize
   ```

5) Sync DB cover paths to final filenames

   ```powershell
   bun run db:sync:covers
   ```

   This updates `books.cover` to the best available extension (prefers WebP, then JPG, then PNG) based on actual files under `public/covers`.

6) Verify data and UI

   ```powershell
   bun run db:list
   bun run dev
   ```

   - Check that New Arrivals/Top Rated/Trending sections render and that covers are not placeholders. See `docs/database-sections.md`.

## Data contract (target shape)

Required/primary fields per book:
- title (string)
- authors (ordered array of canonical names; map to author IDs when we introduce the table)
- isbn10 (string | null), isbn13 (string | null) — validated; at least one preferred
- publisher (string)
- publishedDate (YYYY or YYYY‑MM‑DD)
- language (string code)
- pages (number | null)
- description (string | null)
- categories (array of strings; will become canonical tags)
- cover (string URL/path like `/covers/<id>-<title-slug>.<ext>`) — filled by covers workflow

Note: We previously considered JSON batch files under `artifacts/`, but the importer currently reads typed mocks only. If we re‑enable external batch files, we’ll restore a dedicated section here.

Mocked (temporary):
- ratingsCount (number)
- reviewsCount (number)
- averageRating (number)

## Reporting per batch

Until the importer script is implemented, capture a short report manually:
- Count processed books (should be 100), created vs updated (from seed logs), any failures during cover fetch.
- Keep a `docs/batches/<YYYY-MM-DD>.md` note with: ids, processed/created/updated/failed, and time taken.

## Importer details

`scripts/db/import-batch.ts` reads from `mocks/books.ts`, validates ISBNs and authors, and writes via a shared ingest with two modes:
- `upsert` (default): create new rows or update existing by id.
- `replace`: delete all rows, then insert current mocks (useful for local resets).

## Troubleshooting

- Covers on Windows: use `covers:fetch:node` (Node/tsx) to avoid Bun crash.
- Reset local DB if rows get out of sync: `bun run db:reset` then re‑seed and sync covers.
- If covers don’t update in UI, ensure files exist under `public/covers` and that `db:sync:covers` ran.
- CI: The previous JSON importer dry‑run workflow has been disabled. Importer now reads from typed mocks.

## References

- `docs/covers-fetching.md` — cover workflow details and CLI flags.
- `docs/database-architecture.md` — drivers, env switching, migrations.
- `docs/database-sections.md` — section queries and ranking hints.
