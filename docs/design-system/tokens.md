# Design Tokens

Design tokens are the foundation of the Bukie design system. They provide consistent values for color, typography, spacing, radii, elevation, and breakpoints, enabling scalable theming and layout.

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
Tokens are imported from `src/design/tokens.css.ts` and used in Vanilla Extract styles and components.
