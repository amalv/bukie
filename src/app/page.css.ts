import { style } from "@vanilla-extract/css";
import { tokens } from "@/design/tokens.css";

export const hero = style({
  background: tokens.color.background,
  color: tokens.color.onBackground,
  paddingTop: tokens.spacing["4"],
  paddingBottom: tokens.spacing["3"],
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
  fontSize: tokens.typography.xl,
  lineHeight: tokens.typography.lineHeight.tight,
  color: tokens.color.onBackground,
});

export const subtitle = style({
  margin: 0,
  color: tokens.color.onSurface,
  opacity: 0.75,
  fontSize: tokens.typography.sm,
});

export const searchRow = style({
  marginTop: tokens.spacing["2"],
  display: "flex",
  justifyContent: "center",
  gap: tokens.spacing["1"],
  paddingLeft: tokens.spacing["2"],
  paddingRight: tokens.spacing["2"],
});

export const searchBox = style({
  position: "relative",
  width: "100%",
  maxWidth: "640px",
});

// Wraps the input so clicking the whole area focuses it (label semantics)
export const labelWrap = style({
  position: "relative",
  display: "block",
});
export const input = style({
  width: "100%",
  appearance: "none",
  border: `1px solid ${tokens.color.outline}`,
  background: tokens.color.surface,
  color: tokens.color.onSurface,
  borderRadius: tokens.radius.lg,
  padding: `${tokens.spacing["1"]} ${tokens.spacing["2"]} ${tokens.spacing["1"]} calc(${tokens.spacing["3"]} + 20px)`,
  fontSize: tokens.typography.md,
  lineHeight: tokens.typography.lineHeight.normal,
  boxShadow: tokens.elevation["1"],
  transition: "box-shadow 200ms ease, border-color 200ms ease",
  selectors: {
    "&::placeholder": { color: tokens.color.onSurface, opacity: 0.55 },
    "&:focus": {
      outline: "none",
      borderColor: tokens.color.primary,
      boxShadow: tokens.elevation["2"],
    },
  },
});

export const icon = style({
  position: "absolute",
  left: tokens.spacing["1"],
  top: "50%",
  transform: "translateY(-50%)",
  width: 18,
  height: 18,
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
