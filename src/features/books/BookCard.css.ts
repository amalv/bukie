import { style } from "@vanilla-extract/css";
import { tokens } from "@/design/tokens.css";

export const card = style({
  border: `1px solid rgba(0,0,0,0.08)`,
  borderRadius: tokens.radius.md,
  padding: 0,
  boxShadow: tokens.elevation["1"],
  background: tokens.color.surface,
  display: "flex",
  flexDirection: "column",
  alignItems: "stretch",
  gap: tokens.spacing["1"],
  // Fix card height so all cards align uniformly across rows
  height: 420,
  overflow: "hidden",
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
  width: "100%",
  // Slightly taller media area to match reference composition
  height: 280,
});

export const image = style({
  borderRadius: 0,
  width: "100%",
  height: "100%",
  objectFit: "cover",
  objectPosition: "top",
  display: "block",
  transition: "transform 200ms ease",
  selectors: {
    [`${card}:hover &`]: { transform: "scale(1.02)" },
  },
});

export const mediaOverlay = style({
  position: "absolute",
  inset: 0,
  borderRadius: 0,
  background: "transparent",
  pointerEvents: "none",
  selectors: {
    [`${card}:hover &`]: {
      background: "rgba(0,0,0,0.10)",
    },
  },
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

export const title = style({
  margin: `${tokens.spacing["1"]} 0 ${tokens.spacing["0_5"]}`,
  fontSize: tokens.typography.lg,
  lineHeight: tokens.typography.lineHeight.normal,
  color: tokens.color.onSurface,
  textAlign: "left",
  overflow: "hidden",
  display: "-webkit-box",
  WebkitBoxOrient: "vertical" as unknown as undefined,
  WebkitLineClamp: 2 as unknown as undefined,
});

export const author = style({
  margin: 0,
  color: tokens.color.onSurface,
  opacity: 0.7,
  fontSize: tokens.typography.sm,
  lineHeight: tokens.typography.lineHeight.normal,
  textAlign: "left",
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

// Block-level link for the media area to eliminate inline spacing artifacts
export const mediaLink = style({
  display: "block",
  width: "100%",
  height: "100%",
});

export const meta = style({
  marginTop: tokens.spacing["1"],
  display: "flex",
  alignItems: "center",
  justifyContent: "space-between",
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
  color: "#F59E0B",
});

export const body = style({
  padding: tokens.spacing["2"],
  display: "flex",
  flexDirection: "column",
  gap: tokens.spacing["1"],
});
