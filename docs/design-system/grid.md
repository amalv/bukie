# Grid primitives (12‑column)

The grid provides a small set of primitives to create responsive layouts using a 12‑column system.
It’s implemented with Vanilla Extract and uses design tokens for spacing and breakpoints.

- Container: horizontally centers content; applies responsive max‑widths
- Grid: defines a 12‑column CSS grid; gap variants map to tokens.spacing
- Column: spans one or more columns; supports responsive spans per breakpoint

## Quick start

```tsx
import { Container, Grid, Column } from "src/design/layout/grid";

export default function Example() {
  return (
    <Container>
      <Grid gap="md">
        <Column span={{ base: 12, sm: 6, md: 4 }}>
          {/* content */}
        </Column>
        <Column span={{ base: 12, sm: 6, md: 8 }}>
          {/* content */}
        </Column>
      </Grid>
    </Container>
  );
}
```

## What the numbers mean

In the stories you’ll see blocks labeled 1..12. Each block shows its column span:
- span={1} occupies 1/12 of the row width
- span={6} occupies 6/12 (half the row)
- span={12} occupies the full row

Responsive spans accept an object per breakpoint:
- span={{ base: 12, sm: 6, md: 4 }} means:
  - base (mobile): full width
  - ≥ sm: half width
  - ≥ md: one third width

Breakpoints are aligned to Material‑like ranges and mirrored from tokens.breakpoints.

## Implementation overview

- Styling lives in grid.css.ts and is compiled at build time with Vanilla Extract
- A small helpers.ts module computes which CSS classes to apply for a given span
- Media queries cannot read CSS variables, so we mirror numeric breakpoints inside the style module to generate responsive classes
- Gaps are variant classes backed by tokens.spacing

## Accessibility

- Primitives are un-opinionated divs; avoid setting roles unless the content demands it
- Ensure focus order and keyboard navigation are preserved by your content structure
- Don’t encode meaning purely in span/gap; rely on semantics inside the columns

## Testing

- A unit test ensures the grid module exports build and basic APIs exist
- Storybook tests (via @storybook/addon-vitest) can verify that stories render without errors
