import { globalStyle, style } from "@vanilla-extract/css";
import { darkThemeClass, lightThemeClass, tokens } from "@/design/tokens.css";

export const footer = style({
  // keep footer flush with content and avoid any visible divider band
  marginTop: 0,
  background: tokens.color.background,
  color: tokens.color.onSurface,
  borderTop: "none",
  boxShadow: "none",
  position: "relative",
  zIndex: 1,
});

export const footerInner = style({
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  gap: tokens.spacing["1"],
  // compact vertical padding for mobile / small viewports
  paddingTop: tokens.spacing["2"],
  paddingBottom: tokens.spacing["2"],
  textAlign: "center",
  // slightly larger type so brand row is prominent but not oversized
  fontSize: tokens.typography.lg,
  fontWeight: 700,
  letterSpacing: 0.2,
});

export const brandIconSelector = "footerBrandIcon"; // helper classname target for globalStyle

// Make footer icon match header sizing and color per theme
globalStyle(`${footerInner} .${brandIconSelector}`, {
  width: 20,
  height: 20,
});

// Theme-aware icon color (same as header.brandIcon)
globalStyle(`${lightThemeClass} ${footerInner} .${brandIconSelector}`, {
  color: tokens.color.primary,
});
globalStyle(`${darkThemeClass} ${footerInner} .${brandIconSelector}`, {
  color: tokens.color.primary,
});

// Desktop: a touch more vertical padding at the md breakpoint for balance
globalStyle(`@media (min-width: ${tokens.breakpoints.md})`, {
  [footerInner]: {
    paddingTop: tokens.spacing["3"],
    paddingBottom: tokens.spacing["3"],
  },
});
