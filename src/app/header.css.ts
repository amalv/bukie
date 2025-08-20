import { style } from "@vanilla-extract/css";
import { tokens } from "@/design/tokens.css";

export const header = style({
  background: tokens.color.surface,
  color: tokens.color.onSurface,
  fontSize: "2rem",
  fontWeight: "bold",
  padding: tokens.spacing["3"],
  textAlign: "center",
  borderBottom: `1px solid ${tokens.color.outline}`,
});
