import { style } from "@vanilla-extract/css";
import { tokens } from "@/design/tokens.css";

export const errorBox = style({
  color: tokens.color.error,
  background: tokens.color.surface,
  border: `1px solid ${tokens.color.outline}`,
  borderRadius: tokens.radius.md,
  padding: tokens.spacing["3"],
});

export const emptyBox = style({
  color: tokens.color.onSurface,
  background: tokens.color.surface,
  border: `1px dashed ${tokens.color.outline}`,
  borderRadius: tokens.radius.md,
  padding: tokens.spacing["3"],
  textAlign: "center",
  boxShadow: tokens.elevation["0"],
});

export const footer = style({
  marginTop: tokens.spacing["3"],
  display: "flex",
  justifyContent: "center",
});
