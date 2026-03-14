# Covers pipeline: source to UI

This document explains how cover images flow from the catalog source to the UI, how we enrich covers with local assets, and how we keep the covers folder clean.

## Why this strategy

- Type-safety and SSR: keep the canonical catalog as typed TS (`artifacts/catalog/*.ts`).
- Deterministic rendering: server provides stable `cover` URLs that Next can pre-render.
- Performance & SEO: prefer optimized local WebP files with optional SEO-friendly names.
- Maintainability: enrich covers via a small mapping derived from available assets instead of hardcoding per-item URLs in JSX.

## Flow at a glance

- Source of truth: `artifacts/catalog/sci-fi.ts` exports a typed `Book[]` with placeholder covers.
- Enrichment: the module derives better cover paths when matching files exist in `public/covers` using a simple title slug → filename map.
- Import: `bun run db:import:sci-fi` ingests the catalog into the DB and persists fields including `cover`.
- Fetching: `bun run covers:fetch` downloads from Open Library (ISBN first, then title heuristics) and writes optimized assets under `public/covers`.
- Sync: `bun run db:sync:covers` optionally updates DB rows to the best local extension and SEO filenames.
- Prune: `bun run covers:prune` reports (and with `--commit`, deletes) files not referenced by the current catalog.

## Mermaid: end-to-end

```mermaid
flowchart LR
  subgraph Source
    A[artifacts/catalog/sci-fi.ts\nBook[] typed] --> B{enrich covers\nvia slug map}
  end
  B --> C[db:import:sci-fi\nimport-batch.ts]
  C -->|rows| D[(Database)]

  subgraph Assets
    E[scripts/covers/fetch-covers.ts\nOpen Library] --> F[public/covers/*.webp]
    F --> G[db:sync:covers\nprefer .webp]
    G --> D
  end

  subgraph App
    D --> H[Next.js UI]
    H --> F
  end
```

## Contracts

- Input: typed `Book` items with `cover` (often placeholder) and optional `isbn`.
- Output: `cover` paths that are either existing local assets (`/covers/*.webp|jpg|png`) or the placeholder.
- Error modes: missing files fall back to placeholder; fetch failures are non-fatal.

## Pruning unused covers

- Dry-run by default: `bun run covers:prune` prints counts; add `--print` to list names.
- Delete with confirmation: `bun run covers:prune -- --commit` removes extras.
- Scope: compares files under `public/covers` to `cover` values in the current sci-fi catalog.

## Notes

- Add more genres by importing their typed catalogs into the prune script.
- Title slugs follow a conservative normalization (lowercase, ASCII, hyphens, drop punctuation).
- Keep stories/tests deterministic by re-exporting from `mocks/catalog/*.ts`.

## Does this make sense?

- Yes—typed catalogs give compile-time guarantees and SSR-friendly data. We enrich covers in one place, keep assets optimized and local for performance, and prune safely to avoid bloat. The UI stays simple: it just renders `book.cover` with an accessible Image and a placeholder fallback.
