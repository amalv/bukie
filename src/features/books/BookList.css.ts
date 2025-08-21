import { style } from "@vanilla-extract/css";
import { tokens } from "@/design/tokens.css";

export const errorBox = style({
  color: tokens.color.error,
  background: tokens.color.surface,
  border: `1px solid ${tokens.color.outline}`,
  borderRadius: tokens.radius.md,
  padding: tokens.spacing["3"],
});

export const emptyBox = style({
  color: tokens.color.onSurface,
  background: tokens.color.surface,
  border: `1px dashed ${tokens.color.outline}`,
  borderRadius: tokens.radius.md,
  padding: tokens.spacing["3"],
  textAlign: "center",
  boxShadow: tokens.elevation["0"],
});

export const footer = style({
  marginTop: tokens.spacing["3"],
  display: "flex",
  justifyContent: "center",
});

export const gridTop = style({
  marginTop: tokens.spacing["4"],
});

export const loadMoreButton = style({
  display: "inline-flex",
  alignItems: "center",
  justifyContent: "center",
  padding: `${tokens.spacing["1_5"]} ${tokens.spacing["3"]}`,
  borderRadius: tokens.radius.lg,
  border: `1px solid ${tokens.color.outline}`,
  background: tokens.color.surface,
  color: tokens.color.onSurface,
  boxShadow: tokens.elevation["1"],
  fontSize: "1.125rem",
  lineHeight: 1.2,
  textDecoration: "none",
  transition:
    "box-shadow 200ms ease, transform 150ms ease, border-color 150ms ease",
  selectors: {
    "&:hover, &:focus-visible": {
      outline: "none",
      borderColor: tokens.color.primary,
      boxShadow: tokens.elevation["2"],
      transform: "translateY(-1px)",
    },
    "&:active": {
      transform: "translateY(0)",
      boxShadow: tokens.elevation["1"],
    },
  },
});
