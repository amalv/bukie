import { style } from "@vanilla-extract/css";
import { tokens } from "@/design/tokens.css";

export const card = style({
  border: `1px solid rgba(0,0,0,0.08)`,
  borderRadius: tokens.radius.md,
  padding: tokens.spacing["2"],
  boxShadow: tokens.elevation["1"],
  background: tokens.color.surface,
  display: "flex",
  flexDirection: "column",
  alignItems: "center",
  gap: tokens.spacing["1"],
  minHeight: 240,
  transition:
    "box-shadow 150ms ease, transform 150ms ease, border-color 150ms ease",
  selectors: {
    "&:hover, &:focus-within": {
      boxShadow: tokens.elevation["2"],
      transform: "translateY(-1px)",
      borderColor: "rgba(0,0,0,0.12)",
    },
  },
});

export const media = style({
  position: "relative",
  width: 120,
  height: 180,
});

export const image = style({
  borderRadius: tokens.radius.sm,
  width: "100%",
  height: "100%",
  objectFit: "cover",
  transition: "transform 200ms ease",
  selectors: {
    [`${card}:hover &`]: { transform: "scale(1.02)" },
  },
});

export const mediaOverlay = style({
  position: "absolute",
  inset: 0,
  borderRadius: tokens.radius.sm,
  background:
    "linear-gradient(180deg, rgba(0,0,0,0) 40%, rgba(0,0,0,0.3) 100%)",
  pointerEvents: "none",
});

export const badge = style({
  position: "absolute",
  top: tokens.spacing["1"],
  right: tokens.spacing["1"],
  background: tokens.color.primary,
  color: tokens.color.onPrimary,
  borderRadius: tokens.radius.sm,
  padding: `${tokens.spacing["0_5"]} ${tokens.spacing["1"]}`,
  fontSize: tokens.typography.xs,
  lineHeight: tokens.typography.lineHeight.tight,
  boxShadow: tokens.elevation["1"],
});

export const title = style({
  margin: `${tokens.spacing["1_5"]} 0 ${tokens.spacing["0_5"]}`,
  fontSize: tokens.typography.md,
  lineHeight: tokens.typography.lineHeight.normal,
  color: tokens.color.onSurface,
  textAlign: "center",
});

export const author = style({
  margin: 0,
  color: tokens.color.onSurface,
  opacity: 0.7,
  fontSize: tokens.typography.sm,
  lineHeight: tokens.typography.lineHeight.normal,
  textAlign: "center",
});

export const link = style({
  color: "inherit",
  textDecoration: "none",
  outline: "none",
  selectors: {
    "&:hover, &:focus-visible": {
      textDecoration: "underline",
    },
  },
});

export const meta = style({
  marginTop: tokens.spacing["1"],
  display: "flex",
  alignItems: "center",
  gap: tokens.spacing["1"],
  color: tokens.color.onSurface,
  opacity: 0.85,
  fontSize: tokens.typography.xs,
});

export const stars = style({
  display: "inline-flex",
  alignItems: "center",
  gap: 2,
});

export const starIcon = style({
  width: 12,
  height: 12,
  display: "inline-block",
  color: tokens.color.primary,
});
