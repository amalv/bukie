import { style } from "@vanilla-extract/css";
import { tokens } from "@/design/tokens.css";

export const page = style({
  display: "block",
  padding: tokens.spacing["3"],
});

export const layout = style({
  display: "grid",
  gap: tokens.spacing["3"],
  gridTemplateColumns: "1fr",
  alignItems: "start",
  "@media": {
    "screen and (min-width: 768px)": {
      gridTemplateColumns: "auto 1fr",
      gap: tokens.spacing["4"],
    },
  },
});

export const media = style({
  position: "relative",
  width: 180,
  height: 270,
});

export const cover = style({
  width: "100%",
  height: "100%",
  objectFit: "cover",
  borderRadius: tokens.radius.md,
  boxShadow: tokens.elevation["1"],
});

export const title = style({
  margin: `0 0 ${tokens.spacing["1"]}`,
  fontSize: tokens.typography.xl,
  lineHeight: tokens.typography.lineHeight.tight,
  color: tokens.color.onSurface,
});

export const author = style({
  margin: 0,
  fontSize: tokens.typography.md,
  color: tokens.color.onSurface,
  opacity: 0.8,
});

export const meta = style({
  display: "flex",
  flexDirection: "column",
  gap: tokens.spacing["1"],
});

export const badge = style({
  position: "absolute",
  top: tokens.spacing["1"],
  right: tokens.spacing["1"],
  background: "rgba(255,255,255,0.9)",
  color: tokens.color.onSurface,
  borderRadius: tokens.radius.md,
  border: `1px solid rgba(0,0,0,0.08)`,
  padding: `${tokens.spacing["0_5"]} ${tokens.spacing["1"]}`,
  fontSize: tokens.typography.xs,
  lineHeight: tokens.typography.lineHeight.tight,
  boxShadow: tokens.elevation["1"],
});

export const info = style({
  display: "flex",
  alignItems: "center",
  flexWrap: "wrap",
  gap: tokens.spacing["2"],
});

export const stars = style({
  display: "inline-flex",
  alignItems: "center",
  gap: 4,
});

export const starIcon = style({
  width: 14,
  height: 14,
  display: "inline-block",
  color: tokens.color.star,
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
