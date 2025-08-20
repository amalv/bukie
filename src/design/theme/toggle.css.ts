import { style } from "@vanilla-extract/css";
import { tokens } from "@/design/tokens.css";

export const srOnly = style({
  position: "absolute",
  width: 1,
  height: 1,
  padding: 0,
  margin: -1,
  overflow: "hidden",
  clip: "rect(0, 0, 0, 0)",
  whiteSpace: "nowrap",
  border: 0,
});

export const button = style({
  display: "inline-flex",
  alignItems: "center",
  justifyContent: "center",
  width: 32,
  height: 32,
  borderRadius: 9999,
  border: `1px solid ${tokens.color.outline}`,
  background: tokens.color.surface,
  color: tokens.color.onSurface,
  boxShadow: tokens.elevation["0"],
  cursor: "pointer",
  transition:
    "background 150ms ease, box-shadow 150ms ease, border-color 150ms ease",
  selectors: {
    "&:hover, &:focus-visible": {
      background: tokens.color.overlay,
      outline: "none",
      boxShadow: tokens.elevation["1"],
    },
    '&[aria-pressed="true"]': {
      boxShadow: tokens.elevation["2"],
    },
  },
});

export const icon = style({
  width: 16,
  height: 16,
  opacity: 0.9,
});
