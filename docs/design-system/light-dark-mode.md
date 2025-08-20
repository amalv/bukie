# Light/Dark Mode Implementation

This app implements first-class light/dark theming using Vanilla Extract tokens and SSR-safe bootstrapping to avoid FOUC (flash of unstyled content).

## How it works

1) Tokens and themes
- Contract: `src/design/tokens.css.ts` defines semantic tokens (colors, spacing, type...).
- Themes: `lightThemeClass` and `darkThemeClass` provide values for the contract.

2) Applying the theme (SSR)
- Server reads the `theme` cookie (`"light" | "dark"`). If missing, we default to system preference (`prefers-color-scheme`).
- In `src/app/layout.tsx` we:
  - Set `<html data-theme="light|dark|system">`.
  - Apply the corresponding theme class to `<body>` (light or dark) so tokens resolve on first paint.
  - Inject a tiny script (beforeInteractive) to resolve the final mode before paint to prevent any color swap.

3) User toggle and persistence
- `ThemeToggle` (client) lives at `src/design/theme/ThemeToggle.tsx`.
- On click, we update `data-theme` immediately and call a server action `setTheme` (`src/design/theme/actions.ts`) to persist the cookie.

4) Component styles
- Components should never hardcode colors. Use `tokens.color.*` and border helpers like `tokens.color.outline` and overlays via `tokens.color.overlay`.
- Example updates are in `src/app/page.css.ts`, `src/features/books/BookList.css.ts`, and `src/features/books/BookDetails.css.ts`.

## FOUC (Flash of Unstyled Content)

FOUC is the brief flicker when the UI renders with default styles and then suddenly switches (e.g., from light to dark) after hydration. We prevent it by:
- Setting a `data-theme` on `<html>` and the theme class on `<body>` during SSR.
- Running a small script before the page renders (`beforeInteractive`) that ensures the `data-theme` matches cookie/system preference.

## Changing defaults
- Default theme: adjust the logic in `layout.tsx` if you want to force light/dark.
- Tokens: change role values in `tokens.css.ts` for either theme.

## Testing
- Unit: keep helpers pure; minimal logic stays in the toggle.
- Storybook: render stories under both `lightThemeClass` and `darkThemeClass`.
- E2E: verify no FOUC when system preference is dark and no cookie is present.
