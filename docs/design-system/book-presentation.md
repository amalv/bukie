# Book card and list presentation

- Status: implemented
- Date: 2026-07-26
- Owner: catalog and discovery
- Related issue: #108
- Implementation issue: #120
- Depends on: [catalog metadata and provenance](../decisions/0016-catalog-metadata-provenance.md)

## Outcome

Bukie will use an evidence-aware summary card as the default grid treatment and
a compact horizontal row for search and other comparison-heavy results. A
richer editorial tile remains available for a small featured collection, but
is not the default catalog treatment.

The selected direction keeps the cover, title and ordered authors dominant. It
adds only metadata that helps a user choose the next detail page and that Bukie
can support honestly. It does not expose synthetic popularity, unqualified
rating averages, unavailable library actions or edition facts without a
selected preferred edition.

This document is the design specification implemented by the production book
card and list components.

## Decision criteria

The presentation must:

1. support quick recognition by cover, title and creator;
2. distinguish works without turning the card into a miniature detail page;
3. expose rating evidence only when its sample and provenance state permit it;
4. survive long, multiple and missing metadata from the work-first catalog;
5. provide one clear detail action without duplicate keyboard stops;
6. remain useful from 320 through 1440 CSS pixels;
7. reuse Bukie's tokens, themes, grid and server-rendered content; and
8. define measurable story, unit, accessibility and Playwright states.

## Current-state audit

The audit covers `BookCard`, `BookCardSkeleton`, `BookList`, pagination,
Storybook fixtures, the shared grid and the current catalog contract.

### Annotated current card

```text
┌────────────────────────────┐
│                            │
│          cover         [1] │
│                [genre] [2] │
│                            │
├────────────────────────────┤
│ Title link          ★ 4.5  │ [3]
│ Author                     │ [4]
└────────────────────────────┘

Hidden from sighted users: rating count, year and description.       [5]
Cover and title are separate links to the same destination.          [6]
```

1. The `2:3` cover gives strong recognition, but becomes an oversized
   full-width image in the one-column mobile layout.
2. The category badge competes with cover artwork, can obscure text on the
   image and has no width policy for long or multiple categories.
3. A bare average appears visually while its sample size is screen-reader-only.
   The current values may be synthetic, so the visible hierarchy overstates
   trust.
4. The author is a single scalar string even though the accepted target model
   uses ordered author credits.
5. Screen-reader-only metadata creates different decision information for
   sighted and non-sighted users. Description content also increases verbosity
   without being useful in the card's current visual hierarchy.
6. Duplicate links to the same detail page add a redundant keyboard stop. The
   title link changes color on focus but has no explicit focus indicator.

### Audit findings

| Area | Current behavior | Problem to solve |
|---|---|---|
| Hierarchy | Cover dominates; title, author and average follow | Publication/category context is absent while an unsupported rating is prominent |
| Scanability | Every surface uses the same card and grid | Search, browsing and editorial discovery have different comparison needs |
| Density | Grid is 1/2/4/6-up | Mobile covers are oversized; tablet cards can become narrow abruptly |
| Metadata trust | Average is visible; sample and year are hidden | Evidence and missing states are not understandable |
| Actions | Cover and title link to the same detail route | Duplicate focus targets do not add user value |
| Long data | Title clamps to two lines; author and badge do not | Long/multiple authors and categories can create uneven or overflowing cards |
| Missing data | Cover has a placeholder; other fields disappear | Absence is not consistently distinguished from loading or low confidence |
| Focus | `focus-within` changes border/shadow | The focused link has no clear two-dimensional indicator |
| Touch | Cover is a large target; title is a second target | Targets are large enough but redundant |
| Motion | Hover lift and image scale always run | Reduced-motion preferences are not handled |
| Skeleton | Fixed responsive heights replace a ratio-based cover | Loading and loaded cards can shift; every skeleton is exposed as generic markup |
| Contrast | Secondary text uses opacity on themed colors | Effective contrast is not guaranteed by a semantic token |
| Responsive source | Grid CSS contains two breakpoint sequences | Implementation must consolidate on the supported token values before visual tuning |

The unavailable card action described in the original issue is no longer part
of the current component. It was correctly removed before this decision.

## Explored variants

All examples show information roles rather than final visual styling.

### Variant A: cover-first minimal

```text
┌──────────────────────┐
│                      │
│        cover         │
│                      │
├──────────────────────┤
│ Title, up to 2 lines │
│ Author               │
└──────────────────────┘
```

Primary metadata is limited to cover, title and author. Category, publication
and rating are deferred to the detail page.

Strengths:

- clean and recognizable at moderate card widths;
- resilient when rating and edition data are missing; and
- simplest target for loading and theming.

Weaknesses:

- weak comparison value in a 500-work catalog;
- similar covers/titles are hard to distinguish; and
- does not use trustworthy preferred-edition/category context when available.

Decision: retain as the graceful minimum state, not the default full state.

### Variant B: evidence-aware summary

```text
┌────────────────────────────┐
│                            │
│           cover            │
│                            │
├────────────────────────────┤
│ Title, up to 2 lines       │
│ Author one · Author two    │
│ Category · 1984            │
│ ★ 4.5 · 12.8k ratings     │
└────────────────────────────┘
```

Cover, title and authors remain dominant. One quiet bibliographic line uses the
primary category and preferred-edition publication year. A separate evidence
line appears only for a display-eligible rating with a sample size.

Strengths:

- supports recognition and comparison without using descriptions;
- accommodates the target work/preferred-edition boundary;
- makes rating evidence visible rather than assistive-only; and
- collapses naturally to Variant A when metadata is absent.

Weaknesses:

- needs strict line and eligibility rules to prevent noise;
- requires semantic secondary text tokens with verified contrast; and
- cannot present all authors, categories or edition facts inline.

Decision: selected default grid card.

### Variant C: editorial tile

```text
┌──────────────────────────────────────┐
│              wide cover             │
├──────────────────────────────────────┤
│ Editorial label                     │
│ Title                               │
│ Authors                             │
│ One short, curated reason to read   │
│ View details                        │
└──────────────────────────────────────┘
```

This treatment adds a curated reason or collection context and can use a wider
layout. It does not reuse a book description as promotional copy.

Strengths:

- gives a featured collection a distinct purpose;
- supports editorial context that explains why the work appears; and
- offers comfortable long-title space.

Weaknesses:

- too tall and low-density for catalog browsing;
- requires real curated copy and selection ownership; and
- risks becoming decorative if every section uses it.

Decision: reserve for at most one deliberate featured collection defined by
the homepage work in #109.

### Variant D: compact comparison row

```text
┌──────────┬─────────────────────────────────────────┐
│          │ Title, up to 2 lines                    │
│  cover   │ Author one · Author two                 │
│  2 : 3   │ Category · 1984                         │
│          │ ★ 4.5 · 12.8k ratings                  │
└──────────┴─────────────────────────────────────────┘
```

The row uses a fixed-ratio thumbnail and gives text the majority of horizontal
space. Its metadata rules are identical to Variant B.

Strengths:

- fastest treatment for comparing filtered/search results;
- handles long titles and authors better than a narrow grid card; and
- gives mobile search results useful density without a horizontal carousel.

Weaknesses:

- less cover-led and visually varied;
- needs a minimum row height and careful truncation; and
- is not an efficient default for large desktop catalog walls.

Decision: selected for search results, narrow comparison surfaces and an
optional user-selected list view later.

## Comparison

| Criterion | A: minimal | B: summary | C: editorial | D: compact |
|---|---:|---:|---:|---:|
| Recognition | Strong | Strong | Strong | Good |
| Comparison value | Low | Strong | Medium | Strongest |
| Catalog density | Strong | Good | Low | Strong |
| Long metadata | Medium | Medium | Strong | Strong |
| Missing-data resilience | Strongest | Strong | Medium | Strong |
| Provenance honesty | Strong by omission | Strong with eligibility rules | Depends on curated context | Strong with eligibility rules |
| Default grid suitability | Acceptable fallback | Selected | No | No |
| Search/list suitability | Weak | Acceptable | No | Selected |

## Selected information hierarchy

### Primary

- preferred cover or the shared cover placeholder;
- work title; and
- ordered primary author credits.

These are always present except that an unattributed work may use the stored,
curated label `Anonymous`. The UI must not invent an author.

### Secondary

- one primary Bukie category;
- preferred-edition publication year, only when date precision supports a year;
- rating average plus sample size, only when the ratings policy marks the
  aggregate display-eligible; and
- an explicit `Not rated` state when the surface reserves a rating row.

Secondary fields use a quieter semantic color, not opacity applied to an
arbitrary foreground color.

### Deferred

- additional categories after the primary category;
- author roles and author credits beyond the inline limit;
- publisher, language, format, pages and identifiers;
- exact or partial publication date;
- descriptions and editorial copy;
- source, freshness and confidence detail beyond the card's eligibility state;
- alternate editions; and
- every popularity, trend, recommendation or library claim without a real
  supported signal/action.

Deferred fields belong on the detail page, in an accessible provenance
disclosure, or in a surface designed for that user job.

## Truncation and missing-data rules

- Title: two visual lines in a grid card and two in a compact row. The complete
  title remains the link's accessible name and must be available without hover.
- Authors: show up to two names in source order. Use `and N more` when more
  credits exist; its accessible text includes the hidden names when the domain
  result provides them.
- Category: show only the primary category inline. Truncate to one line without
  placing it over the cover.
- Publication: show the selected preferred-edition year only. A missing or
  conflicting date contributes no separator and no placeholder year.
- Cover: use the shared placeholder. Grid-card cover images are decorative when
  title and authors are adjacent, so use empty alternative text; detail-page
  image rules remain separate.
- Rating: never show an average alone. Show average and formatted sample size
  together only when display-eligible. Use `Not rated` for a true zero-sample
  state and `Rating unavailable` when evidence is withheld, conflicting,
  synthetic or below policy confidence.
- Description: never place a work description in the default card's accessible
  tree when it is not visible.

Separators are conditional. Missing fields must not produce leading, trailing
or doubled dots.

## Action and interaction model

The card has one primary action: open the canonical work detail page.

- When there are no secondary actions, use one link for the card content rather
  than separate cover and title links.
- Do not add a visually primary button that duplicates the card link.
- A future saved-library control must be a separate, clearly named button and
  must not be nested inside a wrapping link. Its implementation waits for the
  authenticated library flow.
- Hover may change elevation or border, but cannot reveal required information.
- Focus uses a visible two-pixel outline with at least a two-pixel offset. The
  outline must not be clipped by the card's rounded overflow.
- Active/touch feedback must not move content enough to cause layout shift.

Keyboard order follows DOM order and reading order:

1. section heading and context;
2. each work's single detail link in visual order;
3. section continuation or pagination action.

No card introduces a tooltip-only fact, pointer-only action or duplicate link
to the same route.

## Surface selection

| Surface | Treatment | Reason |
|---|---|---|
| Default catalog browse | Variant B grid | Cover-led browsing with enough comparison context |
| Search and filtered results | Variant D compact rows | Users compare attributes and scan longer titles |
| Small homepage collection | Variant B grid | Consistent recognition; #109 may choose one Variant C feature |
| Detail-page related works | Variant A or B grid | Use B only when eligible evidence is available |
| Loading | Matching skeleton for selected treatment | Prevent layout shift |
| Empty/error | Surface-level message, not empty cards | Explain recovery once |

The view treatment is a property of the surface, not each record. Missing
metadata collapses within the chosen treatment rather than switching individual
records between grid and row.

## Responsive specification

The default grid uses a `2/3/4/6` column progression and keeps the cover at
`2:3`.

| Viewport | Container target | Columns | Gap | Expected card width | Notes |
|---:|---|---:|---:|---:|---|
| 320 | 16px side padding | 2 | 12px | 138px | No badge overlay; two-line title; whole card is the touch target |
| 768 | 24px side padding | 3 | 24px | 224px | Full evidence-aware summary fits without overlap |
| 1024 | 28px side padding | 4 | 24px | 224px | Stable four-up comparison density |
| 1440 | 32px side padding | 6 | 24px | 209px | Six-up maximum; container prevents uncontrolled widening |

The intended 12-column spans are:

```text
base: 6  → 2-up
sm:   4  → 3-up
md:   4  → 3-up
lg:   3  → 4-up
xl:   2  → 6-up
```

The implementation slice must first remove the duplicate breakpoint sequences
in `grid.module.css` and align them with the shared token values. Tests must
assert the selected spans at 320, 768, 1024 and 1440 rather than relying only
on class names.

Compact rows remain one column at all four validation widths. The cover target
is 88 by 132 pixels at 320, 96 by 144 pixels from 768 upward, with text allowed
to shrink through `min-width: 0`. Rows and cards must not create horizontal
scroll, clipped focus indicators or action overlap at 200% text zoom.

## Accessibility specification

### Names and semantics

- Render each collection as a semantic list when it represents a set of works.
- Each work is one list item with an `h3` title below the section's `h2`.
- The detail link name includes the complete stored title; visible authors
  remain adjacent text rather than being repeated in every link name.
- Decorative card covers use `alt=""`. A meaningful non-cover illustration
  requires its own approved alternative.
- Category and rating symbols include text; the star icon is decorative.

### Focus and touch

- One detail focus stop per card/row until a real secondary action exists.
- Focus is visible in light and dark themes and is not expressed by color
  alone.
- Interactive targets are at least 44 by 44 CSS pixels.
- DOM order never changes across breakpoints.
- Cards do not trap focus and lists do not use arrow-key widgets.

### Contrast and motion

- Body and secondary metadata meet WCAG AA contrast in both themes.
- Borders are not the sole indicator of selected, focused or error state.
- Under `prefers-reduced-motion: reduce`, remove lift, scale and content
  translation; color changes may remain instantaneous.
- Loading shimmer, if introduced, is disabled under reduced motion.

### Loading announcements

- The list owns one `role="status"` message such as `Loading books`.
- Repeated skeleton cards are `aria-hidden="true"` and not focusable.
- Skeleton geometry matches the selected card/row and reserves the same text
  lines to minimize layout shift.
- Incremental pagination preserves existing content and announces the number of
  newly loaded works without moving focus.

## Representative fixtures and story states

The implementation stories use stored illustrative fixtures, not invented
production fallbacks.

| Fixture | Shape | Required result |
|---|---|---|
| Full | Short title, two authors, category, year, eligible rating/count, cover | Every selected line renders with conditional separators |
| Long | 120-character title, four ordered authors, long category | Two-line title; two authors plus count; one-line category; no overflow |
| Minimal | Title, one author, no edition metadata or rating | Variant A graceful minimum; no empty separators |
| Anonymous | Title with curated `Anonymous`, missing cover | Placeholder cover and stored author label |
| Multiple editions | Work with preferred and alternate editions | Card uses only preferred-edition year/cover; no edition mixing |
| Conflicting publication | Date resolution is conflicting | Publication year is omitted |
| Unrated | Trusted zero-sample state | `Not rated`; no numeric average |
| Ineligible rating | Synthetic/stale/low-confidence evidence | `Rating unavailable`; no numeric average or popularity implication |
| Dark theme | Full and minimal fixtures | Same hierarchy, contrast and focus behavior |
| Loading | Grid and compact treatments | Matching hidden skeletons plus one status announcement |
| Error | Surface fetch failure | One alert with a recovery action where retry exists |
| Empty | No works after filtering | Filter-aware explanation and reset path |

Stories must cover Variant B and D at 320, 768, 1024 and 1440. Variant C needs
one story only when #109 selects a real editorial use.

## Follow-up implementation acceptance criteria

The component implementation is ready only when:

- card and compact-row components share one metadata eligibility/formatting
  model rather than duplicating rating and separator logic;
- list semantics, heading order and one-detail-link behavior have unit tests;
- grid spans and compact geometry match all four specified viewports;
- full, long, minimal, multiple-author, missing-cover, missing-publication,
  unrated and ineligible-rating stories exist in light and dark themes;
- Storybook interaction/accessibility tests find no serious violations;
- Playwright verifies no horizontal overflow, clipped focus or action overlap at
  320, 768, 1024 and 1440;
- Playwright verifies keyboard order and visible focus without using a pointer;
- reduced-motion tests confirm lift, scale and translation are disabled;
- skeleton-to-loaded layout shift is below the repository's agreed visual
  regression tolerance;
- SSR output contains title, visible authors and eligible visible metadata; and
- no production card displays synthetic popularity or an average without a
  visible sample-size/evidence state.

## Rejected directions

- **One universal rich card:** rejected because search, catalog and editorial
  surfaces have different user jobs and density requirements.
- **Cover-overlay metadata:** rejected because artwork is not a reliable
  contrast surface and long labels compete with recognition.
- **Description on every card:** rejected because descriptions are not
  consistently available, increase height and are better suited to editorial
  or detail contexts.
- **Horizontal carousel as the mobile default:** rejected because it hides
  inventory, adds pointer/gesture dependence and weakens server-rendered
  scanning.
- **Bare average or synthetic trend badge:** rejected because it creates a
  confidence claim the current data cannot support.
- **Multiple identical detail links:** rejected because duplicate keyboard stops
  do not provide a distinct action.

## Implementation sequencing

1. Consolidate grid breakpoints and add the selected summary/compact primitives
   with representative stories. Implemented in #120.
2. Adopt the compact treatment in #110 search/filter results.
3. Apply the selected collection treatment in #109.
4. Reuse the hierarchy and missing-data language in #112 details without
   copying card-only truncation.
5. Add rating evidence only after #111 defines display eligibility.

A focused component implementation issue should be created after this decision
is accepted. Do not combine the catalog-schema rebuild, homepage redesign,
search filters, detail redesign or ratings policy into that component slice.

## References

- `src/features/books/BookCard.tsx`
- `src/features/books/BookCard.skeleton.tsx`
- `src/features/books/BookList.tsx`
- `src/features/books/PaginatedBooks.client.tsx`
- `src/stories/BookCard.stories.tsx`
- `src/stories/BookList.stories.tsx`
- `src/design/layout/grid/grid.module.css`
- [Accessibility guidance](./accessibility.md)
- [Grid primitives](./grid.md)
- [Design tokens](./tokens.md)
