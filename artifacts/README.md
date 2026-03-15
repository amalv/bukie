This folder previously hosted curated JSON batches (e.g. sample-batch.json) used by importer dry-runs and seeders.

We have switched to typed mocks in `mocks/books.ts` as the single source during development.
Generated importer reports can still be written here for local review, but they should stay local and are gitignored by default.
Only the sample report files are meant to remain tracked.

If you want to reintroduce curated batch files for the importer, place them here and run `bun run db:import` manually. The seeders no longer auto-read JSON.
