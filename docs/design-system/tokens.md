# Design Tokens (KISS)

Design tokens are just named values (like variables) for your UI: colors, spacing, type sizes, radii, and shadows. Instead of hardcoding `#fff` or `16px` everywhere, you use tokens. This keeps the UI consistent, makes themes easy (light/dark), and avoids hunt-and-replace when you tweak the design.

Keep it simple:
- One source of truth: tokens live in `src/design/tokens.css.ts`.
- Use semantic names: `background`, `onSurface`, `primary` instead of raw hex.
- No magic numbers in components: always import and use tokens.

## Color Roles
- `primary`, `onPrimary`, `secondary`, `onSecondary`, `surface`, `onSurface`, `background`, `onBackground`, `error`, `onError`
- Semantic roles map to Material Design 3 conventions
- Colors are defined in Vanilla Extract theme contract

## Typography
- Font sizes: xs, sm, md, lg, xl
- Line heights: xs, sm, md, lg, xl
- Font weights: regular, medium, bold
- All values are string-based for CSS compatibility

## Spacing
- Spacing tokens: 0, 0_5, 1, 2, 3, 4, 6, 8, 12, 16, 24, 32, 40, 48, 56, 64
- Used for margin, padding, grid gaps

## Radii
- Border radius tokens: xs, sm, md, lg, xl

## Elevation
- Shadow tokens: 0, 1, 2, 3, 4, 6, 8, 12, 16, 24

## Breakpoints
- Responsive breakpoints: base, sm, md, lg, xl
- Mirrored in grid and theme contract

## Usage
Tokens are imported from `src/design/tokens.css.ts` and used in Vanilla Extract styles/components.

Example:

```ts
import { tokens } from "@/design/tokens.css";

export const card = style({
	background: tokens.color.surface,
	color: tokens.color.onSurface,
	padding: tokens.spacing["2"],
	borderRadius: tokens.radius.md,
	boxShadow: tokens.elevation["1"],
});
```
