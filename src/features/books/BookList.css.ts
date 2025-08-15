import { style } from "@vanilla-extract/css";
import { tokens } from "@/design/tokens.css";

export const errorBox = style({
  color: tokens.color.error,
  background: tokens.color.surface,
  border: `1px solid rgba(0,0,0,0.08)`,
  borderRadius: tokens.radius.md,
  padding: tokens.spacing["3"],
});

export const emptyBox = style({
  color: tokens.color.onSurface,
  opacity: 0.75,
  padding: tokens.spacing["3"],
  textAlign: "center",
});

export const footer = style({
  marginTop: tokens.spacing["3"],
  display: "flex",
  justifyContent: "center",
});
