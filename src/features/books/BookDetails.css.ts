import { style } from "@vanilla-extract/css";
import { tokens } from "@/design/tokens.css";

export const page = style({
  display: "block",
  padding: tokens.spacing["3"],
  background: tokens.color.background,
  color: tokens.color.onBackground,
});

export const container = style({
  margin: "0 auto",
  maxWidth: 1200,
});

export const layout = style({
  display: "grid",
  gap: tokens.spacing["3"],
  gridTemplateColumns: "1fr",
  alignItems: "start",
  "@media": {
    "screen and (min-width: 768px)": {
      gridTemplateColumns: "auto 1fr",
      gap: tokens.spacing["4"],
    },
  },
});

export const rightCol = style({
  display: "flex",
  flexDirection: "column",
  gap: tokens.spacing["3"],
});

export const backLink = style({
  display: "inline-flex",
  alignItems: "center",
  gap: tokens.spacing["1"],
  marginBottom: tokens.spacing["2"],
  color: tokens.color.onSurface,
  opacity: 0.9,
  textDecoration: "none",
  selectors: {
    "&:hover, &:focus-visible": { color: tokens.color.primary },
  },
});

export const headerRow = style({
  display: "flex",
  alignItems: "flex-start",
  justifyContent: "space-between",
  gap: tokens.spacing["2"],
  marginBottom: tokens.spacing["2"],
});

export const media = style({
  position: "relative",
  width: 180,
  height: 270,
  "@media": {
    "screen and (min-width: 768px)": {
      width: 360,
      height: 540,
    },
  },
});

export const cover = style({
  width: "100%",
  height: "100%",
  objectFit: "cover",
  borderRadius: tokens.radius.md,
  boxShadow: tokens.elevation["1"],
});

export const title = style({
  margin: `0 0 ${tokens.spacing["1"]}`,
  fontSize: tokens.typography.xl,
  lineHeight: tokens.typography.lineHeight.tight,
  color: tokens.color.onSurface,
});

export const author = style({
  margin: 0,
  fontSize: tokens.typography.md,
  color: tokens.color.onSurface,
  opacity: 0.8,
});

export const authorTextSpacing = style({
  marginLeft: 6,
});

export const meta = style({
  display: "flex",
  flexDirection: "column",
  gap: tokens.spacing["1"],
});

// header row defined earlier

export const badge = style({
  background: tokens.color.surface,
  color: tokens.color.onSurface,
  borderRadius: tokens.radius.md,
  border: `1px solid ${tokens.color.outline}`,
  padding: `${tokens.spacing["0_5"]} ${tokens.spacing["1"]}`,
  fontSize: tokens.typography.xs,
  lineHeight: tokens.typography.lineHeight.tight,
  boxShadow: tokens.elevation["1"],
});

export const info = style({
  display: "flex",
  alignItems: "center",
  flexWrap: "wrap",
  gap: tokens.spacing["2"],
});

export const stars = style({
  display: "inline-flex",
  alignItems: "center",
  gap: 4,
});

export const starIcon = style({
  width: 14,
  height: 14,
  display: "inline-block",
  color: tokens.color.star,
});

export const icon = style({
  width: 16,
  height: 16,
  display: "inline-block",
  color: tokens.color.onSurface,
  opacity: 0.8,
});

export const iconTextSpacing = style({
  marginLeft: 4,
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

export const sectionCard = style({
  background: tokens.color.surface,
  color: tokens.color.onSurface,
  borderRadius: tokens.radius.lg,
  border: `1px solid ${tokens.color.outline}`,
  boxShadow: tokens.elevation["1"],
});

export const sectionBody = style({
  padding: tokens.spacing["3"],
  "@media": {
    "screen and (min-width: 768px)": {
      padding: tokens.spacing["4"],
    },
  },
});

export const sectionTitle = style({
  margin: `0 0 ${tokens.spacing["2"]}`,
  fontSize: tokens.typography.lg,
  lineHeight: tokens.typography.lineHeight.normal,
  color: tokens.color.onSurface,
});

export const detailsGrid = style({
  display: "grid",
  gridTemplateColumns: "1fr",
  gap: tokens.spacing["2"],
  "@media": {
    "screen and (min-width: 768px)": {
      gridTemplateColumns: "1fr 1fr",
    },
  },
});

export const label = style({
  fontWeight: 600,
  marginBottom: tokens.spacing["0_5"],
});

export const muted = style({
  opacity: 0.8,
});

export const sections = style({
  display: "flex",
  flexDirection: "column",
  gap: tokens.spacing["3"],
  marginTop: tokens.spacing["3"],
  "@media": {
    "screen and (min-width: 768px)": {
      marginTop: 0,
    },
  },
});

// backLink defined earlier
