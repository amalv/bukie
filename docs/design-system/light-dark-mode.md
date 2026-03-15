# Light/Dark Mode Implementation

This app implements first-class light/dark theming using CSS variables, Tailwind-friendly utilities, and SSR-safe theme application to avoid FOUC (flash of unstyled content).

## How it works

1. Tokens and themes
- Theme variables: `src/app/globals.css` defines semantic tokens for colors, spacing, type, radii, elevation, and breakpoints.
- Theme classes: `lightThemeClass` and `darkThemeClass` from `src/design/tokens.ts` map to the two supported themes.

2. Applying the theme (SSR)
- The server reads the `theme` cookie (`"light" | "dark"`).
- In `src/app/layout.tsx` we:
  - set `<html data-theme="light|dark">`
  - apply the corresponding theme class to `<body>` so the right variables resolve on first paint

3. User toggle and persistence
- `ThemeToggle` lives at `src/design/theme/ThemeToggle.tsx`.
- On click, it updates `data-theme` immediately and calls the `setTheme` server action in `src/design/theme/actions.ts` to persist the cookie.

4. Component styles
- Components should never hardcode colors.
- Use Tailwind classes backed by CSS variables or shared token references from `src/design/tokens.ts`.
- Example updates are in `src/app/page.tsx`, `src/features/books/BookList.tsx`, and `src/features/books/BookDetails.tsx`.

## FOUC (Flash of Unstyled Content)

FOUC is the brief flicker when the UI renders with default styles and then suddenly switches after hydration. We prevent it by:
- setting `data-theme` on `<html>` during SSR
- applying the matching theme class to `<body>` during SSR

## Changing defaults
- Default theme: adjust the logic in `layout.tsx` if you want to force light or dark.
- Tokens: change role values in `src/app/globals.css` for either theme.

## Testing
- Unit: keep helpers pure; minimal logic stays in the toggle.
- Storybook: render stories under both `lightThemeClass` and `darkThemeClass`.
- E2E: verify theme switching and SSR rendering stay stable.
