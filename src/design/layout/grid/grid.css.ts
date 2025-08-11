import { style, styleVariants } from "@vanilla-extract/css";
import { tokens } from "../../tokens.css";

// Note: CSS variables cannot be used in media queries. We mirror the numeric
// values from tokens.breakpoints here to generate media queries. Keep in sync.
const bp = {
  sm: 600,
  md: 905,
  lg: 1240,
  xl: 1440,
} as const;

export const container = style({
  marginLeft: "auto",
  marginRight: "auto",
  paddingLeft: tokens.spacing["2"],
  paddingRight: tokens.spacing["2"],
  width: "100%",
  maxWidth: "100%",
  "@media": {
    [`screen and (min-width: ${bp.sm}px)`]: { maxWidth: "600px" },
    [`screen and (min-width: ${bp.md}px)`]: { maxWidth: "905px" },
    [`screen and (min-width: ${bp.lg}px)`]: { maxWidth: "1240px" },
    [`screen and (min-width: ${bp.xl}px)`]: { maxWidth: "1440px" },
  },
});

export const grid = style({
  display: "grid",
  gridTemplateColumns: "repeat(12, minmax(0, 1fr))",
});

export const gap = styleVariants({
  none: { gap: tokens.spacing["0"] },
  xs: { gap: tokens.spacing["0_5"] },
  sm: { gap: tokens.spacing["1"] },
  md: { gap: tokens.spacing["2"] },
  lg: { gap: tokens.spacing["3"] },
  xl: { gap: tokens.spacing["4"] },
});

const spanBase = Object.fromEntries(
  Array.from({ length: 12 }, (_, i) => {
    const n = (i + 1) as 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10 | 11 | 12;
    return [n, style({ gridColumn: `span ${n} / span ${n}` })];
  }),
) as Record<1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10 | 11 | 12, string>;

const spanAt = (minWidthPx: number) =>
  Object.fromEntries(
    Array.from({ length: 12 }, (_, i) => {
      const n = (i + 1) as 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10 | 11 | 12;
      return [
        n,
        style({
          "@media": {
            [`screen and (min-width: ${minWidthPx}px)`]: {
              gridColumn: `span ${n} / span ${n}`,
            },
          },
        }),
      ];
    }),
  ) as Record<1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10 | 11 | 12, string>;

const spanSm = spanAt(bp.sm);
const spanMd = spanAt(bp.md);
const spanLg = spanAt(bp.lg);
const spanXl = spanAt(bp.xl);

export const spanClasses = {
  base: spanBase,
  sm: spanSm,
  md: spanMd,
  lg: spanLg,
  xl: spanXl,
};

export const boxHelper = style({
  background: tokens.color.primary,
  color: tokens.color.onPrimary,
  padding: tokens.spacing["1"],
  borderRadius: tokens.radius.sm,
  textAlign: "center",
});
