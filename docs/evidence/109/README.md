# Issue 109 responsive evidence

The baseline is the ready Vercel production deployment
`dpl_7LhaMfh1EkjhVADm8oyFP61QzLyx`, created at `2026-07-27T15:04:49Z`.
That is three seconds after main commit
`3105773937547a8674fb6bc127d9fd874d7a1958`, the post-PR #127 release commit.

The after captures use the same catalog and light theme from the issue #109
branch build. Full-page screenshots deliberately include the complete initial
server-rendered catalog page so section order, responsive density, and
continuation paths can be compared.

| Viewport | Before | After |
|---|---|---|
| Mobile, 320 × 1000 | [PNG](./before/mobile-320.png) | [PNG](./after/mobile-320.png) |
| Tablet, 768 × 1100 | [PNG](./before/tablet-768.png) | [PNG](./after/tablet-768.png) |
| Desktop, 1440 × 1200 | [PNG](./before/desktop-1440.png) | [PNG](./after/desktop-1440.png) |

The responsive Playwright contract uses the same three widths and additionally
checks canonical category navigation, keyboard focus, reduced motion, initial
server HTML, and empty-result recovery.
