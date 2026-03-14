# Design Tokens (KISS)

Design tokens are just named values for your UI: colors, spacing, type sizes, radii, and shadows. Instead of hardcoding `#fff` or `16px` everywhere, you use tokens. This keeps the UI consistent, makes themes easy (light/dark), and avoids hunt-and-replace when you tweak the design.

Keep it simple:
- One source of truth: theme values live in `src/app/globals.css`.
- Shared token references for TypeScript consumers live in `src/design/tokens.ts`.
- Use semantic names: `background`, `onSurface`, `primary` instead of raw hex.
- No magic numbers in components: use Tailwind utilities with CSS variables or import shared tokens where needed.

## Color Roles
- `primary`, `onPrimary`, `surface`, `onSurface`, `background`, `onBackground`, `error`, `onError`
- Semantic roles map to Material Design 3 conventions
- Colors are exposed as CSS variables and consumed by Tailwind classes or inline styles

## Typography
- Font sizes: xs, sm, md, lg, xl
- Line heights: tight, normal, relaxed
- All values are string-based for CSS compatibility

## Spacing
- Spacing tokens: `0`, `0_5`, `1`, `1_5`, `2`, `3`, `4`, `6`, `8`
- Used for margin, padding, and grid gaps

## Radii
- Border radius tokens: sm, md, lg

## Elevation
- Shadow tokens: `0`, `1`, `2`, `3`, `4`, `5`

## Breakpoints
- Responsive breakpoints: xs, sm, md, lg, xl
- Mirrored in grid primitives and shared token references

## Usage
Tokens are imported from `src/design/tokens.ts` when TypeScript needs a stable reference, and the app styling is implemented with Tailwind CSS plus CSS variables.

Example:

```ts
import { tokens } from "@/design/tokens";

const cardStyle = {
  background: tokens.color.surface,
  color: tokens.color.onSurface,
  padding: tokens.spacing["2"],
};
```
