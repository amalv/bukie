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

export const cover = style({
  width: 180,
  height: 270,
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
