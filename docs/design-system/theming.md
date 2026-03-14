# Theming & Semantic Roles

Bukie supports theming via CSS variables and Tailwind-friendly utility classes. Themes define color roles, typography, and spacing for light/dark modes and custom branding.

## Theme Switching
- Themes are applied by toggling the root class (for example, `lightThemeClass`)
- All tokens update automatically because the class changes the underlying CSS variables

## Semantic Roles
- Use semantic color roles (`primary`, `surface`, `error`, etc.) for UI elements
- Avoid hardcoding colors; rely on tokens for consistency

## Custom Themes
- Extend the shared token map and CSS variable set together
- Keep breakpoints and spacing in sync with grid and layout primitives

## Usage Example

```tsx
import { lightThemeClass } from "@/design/tokens";
```
