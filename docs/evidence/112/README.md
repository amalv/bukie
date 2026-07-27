# Issue 112 responsive evidence

The before captures use synced `main` at `2f7aea9` after merged PR #128. The
after captures use this issue branch with the same normalized SQLite catalog,
local cover delivery, light theme, and full-page capture settings.

Two records exercise the detail hierarchy:

- **Dune** has a stored description, publication year, identifier, creator,
  category, preferred edition, and current source resolutions.
- **Moby-Dick** has stored work identity and classification but no supported
  description or preferred-edition publication details.

| Record and viewport | Before | After |
|---|---|---|
| Dune, mobile 320 × 900 | [PNG](./before/complete-dune-mobile.png) | [PNG](./after/complete-dune-mobile.png) |
| Dune, tablet 768 × 1024 | [PNG](./before/complete-dune-tablet.png) | [PNG](./after/complete-dune-tablet.png) |
| Dune, desktop 1440 × 1000 | [PNG](./before/complete-dune-desktop.png) | [PNG](./after/complete-dune-desktop.png) |
| Moby-Dick, mobile 320 × 900 | [PNG](./before/partial-moby-dick-mobile.png) | [PNG](./after/partial-moby-dick-mobile.png) |
| Moby-Dick, tablet 768 × 1024 | [PNG](./before/partial-moby-dick-tablet.png) | [PNG](./after/partial-moby-dick-tablet.png) |
| Moby-Dick, desktop 1440 × 1000 | [PNG](./before/partial-moby-dick-desktop.png) | [PNG](./after/partial-moby-dick-desktop.png) |

The expanded desktop [provenance disclosure](./after/complete-dune-provenance-desktop.png)
shows the progressive source, resolution-state, evidence-kind, and retrieval
date treatment. Focused Playwright coverage uses the same three viewport widths
and additionally verifies server HTML, structured data, keyboard focus,
reduced motion, empty-group suppression, partial recovery, and an isolated
withdrawn-cover resolution.
