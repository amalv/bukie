# Covers Pipeline: Source to UI

This document explains how cover images flow from the catalog source to the UI, how we enrich covers with local assets, and how we keep the covers folder clean.

## Why this strategy

- Type safety and SSR: keep the canonical catalog as typed TS in `artifacts/catalog/*.ts`.
- Deterministic rendering: each book resolves to a stable `cover` URL before the app renders.
- Performance: pre-optimize WebP covers before uploading them to R2.
- Maintainability: use one canonical filename shape, `/covers/<id>.webp`, plus a temporary legacy fallback while older files are being cleaned up.

## Storage policy

- Cloudflare R2 is the production source of truth for curated covers.
- Catalogs and database rows retain provider-neutral `/covers/<id>.webp` values.
- Vercel serves those objects through `/api/media/covers/*` with immutable CDN
  caching, so the bucket remains private.
- `public/covers` is a temporary local working set for fetch, optimization, and
  backfill commands. It is not the production source of truth after cutover.
- The R2 and local-cache workflow is documented in `docs/media-storage.md`.
- The publishing workflow for new covers is documented in
  `docs/adding-covers.md`.

## Flow at a glance

- Source of truth: `artifacts/catalog/*.ts` exports typed `Book[]` batches, and `artifacts/catalog/index.ts` combines them for the app seed path.
- Catalog output: `artifacts/catalog/build.ts` emits canonical id-based cover paths using `/covers/<id>.webp`.
- Import: category-specific `bun run db:import:*` commands ingest each batch into the DB and persist fields including `cover`.
- Fetching: `bun run covers:fetch` downloads from Open Library (ISBN first, then Search API and manual fallbacks) and writes assets under `public/covers`.
- Resolution: `src/media/covers.ts` turns provider-agnostic cover values into local URLs or the private R2-backed media route depending on env flags.
- Sync: `bun run db:sync:covers` updates DB rows to the best local extension for the current typed catalog.
- Prune: `bun run covers:prune` reports, and with `--commit` deletes, files not referenced by the current catalog.
- Cache hydrate: `bun run covers:cache:hydrate` rebuilds `.cache/covers`
  directly from private R2 when local cached files are useful.

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
    G --> H[explicit Wrangler publish]
    G --> N[db:sync:covers\nprefer local id-based files]
    N --> E
    G --> I[covers:prune\nremove unreferenced files]
  end
  H --> M[(Private R2 bucket)]

  subgraph App
    E --> J[Next.js UI]
    J --> K[src/media/covers.ts\nresolve local or R2 src]
    K --> G
    K --> L[Vercel media route]
    L --> M
  end
```

## Contracts

- Input: typed `Book` items with `cover` and optional `isbn`.
- Output: app-facing `cover` paths that are local assets, private R2-backed
  `/api/media/covers/*` URLs, or the local placeholder.
- Error mode: missing local files resolve to `/covers/placeholder.svg`; private
  route misses and R2 failures redirect there.

## Pruning unused covers

- Dry-run by default: `bun run covers:prune` prints counts.
- Add `--print` to list filenames.
- Delete with confirmation: `bun run covers:prune -- --commit`.
- Scope: compares files under `public/covers` to `cover` values in the combined typed catalog.

## Notes

- New category batches should be exported from `artifacts/catalog/index.ts` so cover tooling sees them automatically.
- Generated catalog IDs are deterministic, so the cover filename contract stays stable across re-imports.
- Generated importer reports are local-only artifacts and should not be committed.
- This document describes the current curated-cover pipeline, not a future
  user-upload pipeline.
- The optional cache is untracked and should be rehydrated from R2, not treated as the source of truth.
