import { style } from "@vanilla-extract/css";
import { tokens } from "@/design/tokens.css";

export const hero = style({
  background: tokens.color.background,
  color: tokens.color.onBackground,
  paddingTop: tokens.spacing["6"],
  paddingBottom: tokens.spacing["6"],
});

export const header = style({
  display: "flex",
  flexDirection: "column",
  alignItems: "center",
  gap: tokens.spacing["1"],
  textAlign: "center",
});

export const title = style({
  margin: 0,
  // Larger display-like title
  fontSize: "clamp(2rem, 4.5vw, 2.75rem)",
  lineHeight: tokens.typography.lineHeight.tight,
  color: tokens.color.onBackground,
});

export const subtitle = style({
  margin: 0,
  color: tokens.color.onSurface,
  opacity: 0.8,
  fontSize: "clamp(1rem, 2vw, 1.125rem)",
});

export const searchRow = style({
  marginTop: tokens.spacing["2"],
  display: "flex",
  justifyContent: "center",
  width: "100%",
  gap: tokens.spacing["1"],
  paddingLeft: tokens.spacing["2"],
  paddingRight: tokens.spacing["2"],
});

export const searchBox = style({
  position: "relative",
  width: "100%",
  flex: "1 1 0%",
  minWidth: 0,
  maxWidth: "960px",
});

// Wraps the input so clicking the whole area focuses it (label semantics)
export const labelWrap = style({
  position: "relative",
  display: "block",
  width: "100%",
});

// Ensure the form stretches to the available width inside the row
export const form = style({
  width: "100%",
});
export const input = style({
  width: "100%",
  appearance: "none",
  border: `1px solid ${tokens.color.outline}`,
  background: tokens.color.surface,
  color: tokens.color.onSurface,
  borderRadius: "9999px",
  padding: `${tokens.spacing["1_5"]} ${tokens.spacing["4"]} ${tokens.spacing["1_5"]} calc(${tokens.spacing["4"]} + 20px)`,
  fontSize: "clamp(0.95rem, 1.6vw, 1.0625rem)",
  lineHeight: tokens.typography.lineHeight.normal,
  boxShadow: tokens.elevation["1"],
  transition: "box-shadow 200ms ease, border-color 200ms ease",
  selectors: {
    "&::placeholder": { color: tokens.color.onSurface, opacity: 0.6 },
    "&:focus": {
      outline: "none",
      borderColor: tokens.color.primary,
      boxShadow: tokens.elevation["2"],
    },
  },
});

export const icon = style({
  position: "absolute",
  left: tokens.spacing["2"],
  top: "50%",
  transform: "translateY(-50%)",
  width: 20,
  height: 20,
  color: tokens.color.onSurface,
  opacity: 0.6,
  pointerEvents: "none",
});

export const clearLink = style({
  alignSelf: "center",
  color: tokens.color.primary,
  textDecoration: "none",
  fontSize: tokens.typography.sm,
  padding: `${tokens.spacing["0_5"]} ${tokens.spacing["1"]}`,
  borderRadius: tokens.radius.sm,
  selectors: {
    "&:hover, &:focus-visible": {
      background: tokens.color.overlay,
      outline: "none",
    },
  },
});

export const searchMeta = style({
  marginTop: tokens.spacing["1"],
  textAlign: "center",
  color: tokens.color.onSurface,
  opacity: 0.75,
  fontSize: tokens.typography.sm,
});
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

// Sections nav (tabs/pills)
export const sectionsNav = style({
  marginTop: tokens.spacing["2"],
});

export const sectionDivider = style({
  marginTop: tokens.spacing["2"],
  borderTop: `1px solid ${tokens.color.outline}`,
});

export const tabsList = style({
  display: "flex",
  gap: tokens.spacing["1"],
  listStyle: "none",
  padding: 0,
  margin: 0,
});

export const tabLink = style({
  display: "inline-flex",
  alignItems: "center",
  gap: tokens.spacing["0_5"],
  textDecoration: "none",
  border: `1px solid ${tokens.color.outline}`,
  padding: `${tokens.spacing["1"]} ${tokens.spacing["2"]}`,
  borderRadius: "9999px",
  background: tokens.color.surface,
  color: tokens.color.onSurface,
  boxShadow: tokens.elevation["0"],
  transition:
    "box-shadow 180ms ease, border-color 150ms ease, transform 120ms ease, background-color 150ms ease, color 150ms ease",
  selectors: {
    "&:hover, &:focus-visible": {
      borderColor: tokens.color.primary,
      boxShadow: tokens.elevation["1"],
      outline: "none",
      transform: "translateY(-1px)",
    },
    "&[aria-current='page']": {
      background: tokens.color.primary,
      color: tokens.color.onPrimary,
      borderColor: tokens.color.primary,
      boxShadow: tokens.elevation["1"],
    },
  },
});

// Main content surface after the hero. In Material terms this approximates
// a surface container, distinct from the app background.
export const contentSurface = style({
  background: tokens.color.surface,
  color: tokens.color.onSurface,
  borderTop: `1px solid ${tokens.color.outline}`,
  paddingTop: tokens.spacing["2"],
  paddingBottom: tokens.spacing["4"],
});

// Section header above the grid (icon + title)
export const sectionHeader = style({
  marginTop: tokens.spacing["2"],
  marginBottom: tokens.spacing["1"],
  display: "flex",
  alignItems: "center",
  gap: tokens.spacing["1"],
  justifyContent: "flex-start",
});

export const sectionTitleRow = style({
  display: "inline-flex",
  alignItems: "center",
  gap: tokens.spacing["1"],
});

export const sectionIcon = style({
  display: "inline-flex",
  alignItems: "center",
  justifyContent: "center",
  width: 28,
  height: 28,
  borderRadius: "9999px",
  border: `1px solid ${tokens.color.outline}`,
  background: tokens.color.background,
  boxShadow: tokens.elevation["0"],
});

export const sectionTitle = style({
  margin: 0,
  fontSize: "clamp(1.125rem, 2.2vw, 1.5rem)",
  lineHeight: tokens.typography.lineHeight.tight,
  color: tokens.color.onBackground,
});

// Color-only icon for the section header (no circle)
export const sectionHeaderIcon = style({
  color: tokens.color.primary,
});
