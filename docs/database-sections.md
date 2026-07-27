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
- The homepage shows a six-work preview and links to the canonical
  `?sort=added` catalog for the complete deterministic sequence.

## Browse by category

- Lists active Bukie-owned categories in `(label ASC, slug ASC)` order.
- Every category link uses the canonical `?category=<slug>` catalog URL.
- Category labels describe catalog classification only; they do not imply an
  editorial endorsement or recommendation.

## Homepage discovery contract

| Section | User need | Rule | Freshness | Empty/error fallback |
|---|---|---|---|---|
| Browse by Category | Choose a subject and continue in a shareable filtered catalog | Active normalized categories ordered A–Z | Changes when the curated category map changes | Keep New Arrivals and All Books available |
| New Arrivals | See which works Bukie cataloged most recently | Preferred-edition `cataloged_at DESC`, then work ID | Changes when catalog records are added | Continue to All Books |
| All Books | Browse the complete catalog | `sort_title ASC`, then work ID | Changes when catalog records are added or corrected | State that the catalog is empty/unavailable without inventing records |

The default homepage resolves these reads independently. A category or arrivals
failure therefore does not erase a successful complete-catalog read, and each
section reports its own recovery path. Search, filters, non-default sorts, and
pagination continue to use the canonical catalog surface rather than rendering
duplicate homepage discovery previews.

Rating- and activity-ranked sections are unavailable until a separate trusted
ratings/activity architecture supplies explicit evidence. The runtime does not
derive Top Rated or Trending sections from legacy synthetic values.

Queries live in `src/db/catalog/repository.ts` and are exposed by
`src/features/books/repo.ts`.
