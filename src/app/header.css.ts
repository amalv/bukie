import { style } from "@vanilla-extract/css";
import { tokens } from "@/design/tokens.css";

export const header = style({
  background: tokens.color.background,
  color: tokens.color.onSurface,
  borderBottom: `1px solid ${tokens.color.outline}`,
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
});
