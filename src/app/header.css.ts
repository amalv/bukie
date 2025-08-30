import { globalStyle, style } from "@vanilla-extract/css";
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
  // bring footer visually closer to page content and use a subtler divider
  // keep footer compact by avoiding extra top margin
  background: tokens.color.background,
  color: tokens.color.onSurface,
  // use overlay token for a lightweight 1px divider that maps well in light/dark
  borderTop: `1px solid ${tokens.color.overlay}`,
});

export const footerInner = style({
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  gap: tokens.spacing["2"],
  // compact vertical padding so the footer band is proportional to content
  paddingTop: tokens.spacing["1"],
  paddingBottom: tokens.spacing["1"],
  textAlign: "center",
  // slightly larger type inside the footer band so the brand row reads prominent
  fontSize: tokens.typography.lg,
  // increase the brand icon inside the footer only (keeps header icon unchanged)
});

// Target the brand icon specifically when it's a descendant of the footer inner container.
// Use `globalStyle` with the generated class names to avoid invalid selector errors.
globalStyle(`${footerInner} ${brandIcon}`, {
  width: 24,
  height: 24,
});

// Slightly more vertical padding on wider viewports for improved balance
globalStyle(`@media (min-width: ${tokens.breakpoints.md})`, {
  [footerInner]: {
    paddingTop: tokens.spacing["1_5"],
    paddingBottom: tokens.spacing["1_5"],
  },
});
