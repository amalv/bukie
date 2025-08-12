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
});

export const image = style({
  borderRadius: tokens.radius.sm,
  width: 120,
  height: 180,
  objectFit: "cover",
});

export const title = style({
  margin: `${tokens.spacing["1_5"]} 0 ${tokens.spacing["0_5"]}`,
  fontSize: tokens.typography.md,
  lineHeight: tokens.typography.lineHeight.normal,
  color: tokens.color.onSurface,
});

export const author = style({
  margin: 0,
  color: tokens.color.onSurface,
  opacity: 0.7,
  fontSize: tokens.typography.sm,
  lineHeight: tokens.typography.lineHeight.normal,
});
