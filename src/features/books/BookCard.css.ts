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
  // Remove inter-section gap; the body already has padding
  gap: tokens.spacing["0"],
  // Make all cards fill their grid cell height so rows align
  height: "100%",
  // Allow content to define height; keep overflow hidden for media overlay rounding
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
  // Fixed heights so all cards align perfectly across rows
  height: 176,
  // Keep slight rounding inherited from card and clip overlays
  overflow: "hidden",
  // Responsive tweaks
  "@media": {
    "screen and (min-width: 600px)": { height: 196 },
    "screen and (min-width: 905px)": { height: 220 },
    "screen and (min-width: 1240px)": { height: 240 },
  },
});

export const image = style({
  borderRadius: 0,
  width: "100%",
  height: "100%",
  objectFit: "cover",
  // Center to avoid awkward top-cropping with wider aspect ratios
  objectPosition: "center",
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
  transition: "background 200ms ease",
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
  zIndex: 1,
});

const clampWebkitProps: Record<string, string | number> = {
  WebkitBoxOrient: "vertical",
  WebkitLineClamp: 2,
};

export const title = style({
  // Tighter spacing above and below the title
  margin: `${tokens.spacing["0_5"]} 0 ${tokens.spacing["0_5"]}`,
  // Slightly smaller title for a denser card
  fontSize: tokens.typography.lg,
  lineHeight: tokens.typography.lineHeight.normal,
  color: tokens.color.onSurface,
  fontWeight: 700,
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
  // Keep the author snug under the title
  margin: 0,
  color: tokens.color.onSurface,
  // Improve author contrast for legibility
  opacity: 0.9,
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
  // Reduce space before meta row
  marginTop: tokens.spacing["0_5"],
  display: "flex",
  alignItems: "center",
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
  width: 14,
  height: 14,
  display: "inline-block",
  color: tokens.color.star,
});

// Single rating row with star + value + optional count
export const ratingRow = style({
  display: "inline-flex",
  alignItems: "center",
  gap: tokens.spacing["0_5"],
});

export const ratingsCount = style({
  opacity: 0.8,
  fontSize: tokens.typography.xs,
});

export const srOnly = style({
  position: "absolute",
  width: 1,
  height: 1,
  padding: 0,
  margin: -1,
  overflow: "hidden",
  clip: "rect(0, 0, 0, 0)",
  whiteSpace: "nowrap",
  border: 0,
});

export const body = style({
  // Slightly tighter padding around the text block
  padding: tokens.spacing["1_5"],
  display: "flex",
  flexDirection: "column",
  gap: tokens.spacing["1"],
  transition: "transform 200ms ease",
  selectors: {
    [`${card}:hover &`]: { transform: "translateY(-1px)" },
  },
});

// Optional short description for the card body, clamped to 2 lines.
const descClampProps: Record<string, string | number> = {
  WebkitBoxOrient: "vertical",
  // Clamp to 2 lines for a compact body
  WebkitLineClamp: 2,
};

export const description = style({
  margin: 0,
  color: tokens.color.onSurface,
  opacity: 0.85,
  fontSize: tokens.typography.sm,
  lineHeight: tokens.typography.lineHeight.relaxed,
  display: "-webkit-box",
  overflow: "hidden",
  // Vendor-prefixed props for line clamp
  ...descClampProps,
});

// Actions row under the description
export const actions = style({
  marginTop: tokens.spacing["1"],
  display: "flex",
  alignItems: "center",
  gap: tokens.spacing["1"],
});

const buttonBase = {
  appearance: "none" as const,
  borderRadius: tokens.radius.md,
  padding: `${tokens.spacing["1"]} ${tokens.spacing["2"]}`,
  fontSize: tokens.typography.sm,
  fontWeight: 600,
  lineHeight: tokens.typography.lineHeight.normal,
  cursor: "pointer",
  transition:
    "background 150ms ease, color 150ms ease, border-color 150ms ease, box-shadow 150ms ease",
};

export const primaryButton = style({
  ...buttonBase,
  background: tokens.color.primary,
  color: tokens.color.onPrimary,
  border: `1px solid ${tokens.color.primary}`,
  boxShadow: tokens.elevation["1"],
  selectors: {
    "&:hover": { boxShadow: tokens.elevation["2"] },
    "&:focus-visible": {
      outline: "none",
      boxShadow: `${tokens.elevation["3"]}, 0 0 0 2px ${tokens.color.onPrimary} inset`,
    },
  },
});

export const secondaryButton = style({
  ...buttonBase,
  background: "transparent",
  color: tokens.color.onSurface,
  border: `1px solid ${tokens.color.outline}`,
  selectors: {
    "&:hover": { background: tokens.color.overlay },
    "&:focus-visible": {
      outline: "none",
      boxShadow: `0 0 0 2px ${tokens.color.primary} inset`,
    },
  },
});

// Floating icon button over media (e.g. favorite)
export const iconButton = style({
  position: "absolute",
  top: tokens.spacing["1"],
  left: tokens.spacing["1"],
  zIndex: 1,
  background: tokens.color.surface,
  color: tokens.color.onSurface,
  border: `1px solid ${tokens.color.outline}`,
  width: 34,
  height: 34,
  borderRadius: 9999,
  display: "inline-flex",
  alignItems: "center",
  justifyContent: "center",
  boxShadow: tokens.elevation["1"],
  transition: "transform 120ms ease, box-shadow 150ms ease",
  // Decorative; no pointer interactivity
  pointerEvents: "none",
  selectors: {
    [`${card}:hover &`]: {
      transform: "scale(1.05)",
      boxShadow: tokens.elevation["2"],
    },
  },
});

export const heartIcon = style({
  width: 18,
  height: 18,
});
