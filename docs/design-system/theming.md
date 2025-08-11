# Theming & Semantic Roles

Bukie supports theming via Vanilla Extract contracts. Themes define color roles, typography, and spacing for light/dark modes and custom branding.

## Theme Switching
- Themes are applied by toggling the root class (e.g., `lightThemeClass`)
- All tokens update automatically

## Semantic Roles
- Use semantic color roles (primary, surface, error, etc.) for UI elements
- Avoid hardcoding colors; rely on tokens for consistency

## Custom Themes
- Extend the theme contract to add new roles or override values
- Keep breakpoints and spacing in sync with grid and layout primitives

## Usage Example
```tsx
import { lightThemeClass } from "src/design/tokens.css.ts";
```
