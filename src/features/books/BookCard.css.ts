import { style } from "@vanilla-extract/css";
import { tokens } from "@/design/tokens.css";

export const card = style({
  border: `1px solid ${tokens.color.outline}`,
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
    "box-shadow 200ms ease, transform 200ms ease, border-color 200ms ease",
  selectors: {
    "&:hover, &:focus-within": {
      boxShadow: tokens.elevation["3"],
      transform: "translateY(-2px)",
      // Emphasize border on hover for both themes
      borderColor: tokens.color.primary,
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
  transition: "transform 300ms ease",
  selectors: {
    [`${card}:hover &`]: { transform: "scale(1.05)" },
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
      background: tokens.color.overlay,
    },
  },
});

export const badge = style({
  position: "absolute",
  top: tokens.spacing["1"],
  right: tokens.spacing["1"],
  background: tokens.color.surface,
  color: tokens.color.onSurface,
  borderRadius: tokens.radius.md,
  border: `1px solid ${tokens.color.outline}`,
  padding: `${tokens.spacing["0_5"]} ${tokens.spacing["1"]}`,
  fontSize: tokens.typography.xs,
  lineHeight: tokens.typography.lineHeight.tight,
  boxShadow: tokens.elevation["1"],
});

const clampWebkitProps: Record<string, string | number> = {
  WebkitBoxOrient: "vertical",
  WebkitLineClamp: 2,
};

export const title = style({
  margin: `${tokens.spacing["1"]} 0 ${tokens.spacing["0_5"]}`,
  fontSize: tokens.typography.lg,
  lineHeight: tokens.typography.lineHeight.normal,
  color: tokens.color.onSurface,
  textAlign: "left",
  overflow: "hidden",
  display: "-webkit-box",
  // Vendor-prefixed clamp for WebKit: assign via spread to avoid TS complaining about unknown keys
  ...clampWebkitProps,
  transition: "color 200ms ease",
  selectors: {
    [`${card}:hover &`]: { color: tokens.color.primary },
  },
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
    "&:focus-visible": { color: tokens.color.primary },
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
  color: tokens.color.star,
});

export const body = style({
  padding: tokens.spacing["2"],
  display: "flex",
  flexDirection: "column",
  gap: tokens.spacing["1"],
  transition: "transform 200ms ease",
  selectors: {
    [`${card}:hover &`]: { transform: "translateY(-1px)" },
  },
});
