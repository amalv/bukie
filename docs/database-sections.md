# Catalog sections and query semantics

The homepage exposes only sections supported by normalized catalog evidence.

## All books

- Returns one card per work.
- Orders by `(works.sort_title ASC, works.id ASC)`.
- Uses both values in the opaque keyset cursor.
- Projects ordered authors, primary category, preferred edition, selected
  publication date, and selected available cover.

## Search

- Matches selected work title or ordered author display name.
- Returns distinct works in the same `(sort_title, work ID)` order as browse.
- Uses the same stable cursor contract as All books.

## New arrivals

- Uses `editions.cataloged_at` from each work's preferred edition.
- Orders by `cataloged_at DESC, works.id ASC`.
- `cataloged_at` is catalog-add time, not publication time.

Rating- and activity-ranked sections are unavailable until a separate trusted
ratings/activity architecture supplies explicit evidence. The runtime does not
derive Top Rated or Trending sections from legacy synthetic values.

Queries live in `src/db/catalog/repository.ts` and are exposed by
`src/features/books/repo.ts`.
