import { style } from "@vanilla-extract/css";
import { tokens } from "@/design/tokens.css";

export const skeleton = style({
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
  background: "#eee",
});

export const line = style({
  width: "80%",
  height: "1.2em",
  background: "#e0e0e0",
  borderRadius: tokens.radius.sm,
  marginBottom: tokens.spacing["0_5"],
});
