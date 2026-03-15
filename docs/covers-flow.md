# Covers Pipeline: Source to UI

This document explains how cover images flow from the catalog source to the UI, how we enrich covers with local assets, and how we keep the covers folder clean.

## Why this strategy

- Type safety and SSR: keep the canonical catalog as typed TS in `artifacts/catalog/*.ts`.
- Deterministic rendering: each book resolves to a stable `cover` URL before the app renders.
- Performance: prefer optimized local WebP files under `public/covers`.
- Maintainability: use one canonical filename shape, `/covers/<id>.webp`, plus a temporary legacy fallback while older files are being cleaned up.

## Flow at a glance

- Source of truth: `artifacts/catalog/*.ts` exports typed `Book[]` batches, and `artifacts/catalog/index.ts` combines them for the app seed path.
- Catalog output: `artifacts/catalog/build.ts` emits canonical id-based cover paths using `/covers/<id>.webp`.
- Import: category-specific `bun run db:import:*` commands ingest each batch into the DB and persist fields including `cover`.
- Fetching: `bun run covers:fetch` downloads from Open Library (ISBN first, then Search API and manual fallbacks) and writes assets under `public/covers`.
- Sync: `bun run db:sync:covers` updates DB rows to the best local extension for the current typed catalog.
- Prune: `bun run covers:prune` reports, and with `--commit` deletes, files not referenced by the current catalog.

## Mermaid: end-to-end

```mermaid
flowchart LR
  subgraph Source
    A[artifacts/catalog/*.ts\nBook[] typed] --> B[artifacts/catalog/index.ts]
    B --> C[build.ts resolves\n/covers/<id>.webp]
  end

  C --> D[db:import:* \nimport-batch.ts]
  D -->|rows| E[(Database)]

  subgraph Assets
    F[scripts/covers/fetch-covers.ts\nOpen Library] --> G[public/covers/*.webp]
    G --> H[db:sync:covers\nprefer local id-based files]
    H --> E
    G --> I[covers:prune\nremove unreferenced files]
  end

  subgraph App
    E --> J[Next.js UI]
    J --> G
  end
```

## Contracts

- Input: typed `Book` items with `cover` and optional `isbn`.
- Output: app-facing `cover` paths that are either existing local assets (`/covers/*.webp|jpg|png`) or the placeholder.
- Error mode: missing files fall back to `/covers/placeholder.svg`.

## Pruning unused covers

- Dry-run by default: `bun run covers:prune` prints counts.
- Add `--print` to list filenames.
- Delete with confirmation: `bun run covers:prune -- --commit`.
- Scope: compares files under `public/covers` to `cover` values in the combined typed catalog.

## Notes

- New category batches should be exported from `artifacts/catalog/index.ts` so cover tooling sees them automatically.
- Generated catalog IDs are deterministic, so the cover filename contract stays stable across re-imports.
- Generated importer reports are local-only artifacts and should not be committed.
