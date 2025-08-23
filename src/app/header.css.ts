import { style } from "@vanilla-extract/css";
import { darkThemeClass, lightThemeClass, tokens } from "@/design/tokens.css";

export const header = style({
  background: tokens.color.background,
  color: tokens.color.onSurface,
  borderBottom: `1px solid ${tokens.color.outline}`,
  position: "fixed",
  top: 0,
  left: 0,
  right: 0,
  zIndex: 100,
});

export const inner = style({
  display: "flex",
  alignItems: "center",
  justifyContent: "space-between",
  minHeight: 56,
  paddingLeft: tokens.spacing["2"],
  paddingRight: tokens.spacing["2"],
});

export const brand = style({
  display: "inline-flex",
  alignItems: "center",
  gap: tokens.spacing["1"],
  fontSize: tokens.typography.lg,
  fontWeight: 700,
  letterSpacing: 0.2,
});

export const brandIcon = style({
  width: 20,
  height: 20,
  display: "inline-block",
  selectors: {
    [`${lightThemeClass} &`]: { color: tokens.color.primary },
    [`${darkThemeClass} &`]: { color: tokens.color.primary },
  },
});

// Spacer to offset the fixed header height so content isn't hidden beneath it
export const offset = style({
  height: 56,
});

export const footer = style({
  marginTop: tokens.spacing["4"],
  background: tokens.color.background,
  color: tokens.color.onSurface,
  borderTop: `1px solid ${tokens.color.outline}`,
});

export const footerInner = style({
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  gap: tokens.spacing["1"],
  minHeight: 80,
  textAlign: "center",
});
