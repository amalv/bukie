import { style } from "@vanilla-extract/css";
import { tokens } from "@/design/tokens.css";

export const skeleton = style({
  border: `1px solid ${tokens.color.outline}`,
  borderRadius: tokens.radius.md,
  padding: 0,
  boxShadow: tokens.elevation["1"],
  background: tokens.color.surface,
  display: "flex",
  flexDirection: "column",
  alignItems: "stretch",
  gap: tokens.spacing["0"],
  height: "100%",
  overflow: "hidden",
});

export const media = style({
  position: "relative",
  width: "100%",
  height: 176,
  background: "#eee",
  "@media": {
    "screen and (min-width: 600px)": { height: 196 },
    "screen and (min-width: 905px)": { height: 220 },
    "screen and (min-width: 1240px)": { height: 240 },
  },
});

export const body = style({
  padding: tokens.spacing["1_5"],
  display: "flex",
  flexDirection: "column",
  gap: tokens.spacing["1"],
});

export const line = style({
  width: "80%",
  height: "1.2em",
  background: "#e0e0e0",
  borderRadius: tokens.radius.sm,
  marginBottom: tokens.spacing["0_5"],
});
