export const lightThemeClass = "theme-light";
export const darkThemeClass = "theme-dark";

export const tokens = {
  spacing: {
    "0": "var(--spacing-0)",
    "0_5": "var(--spacing-0-5)",
    "1": "var(--spacing-1)",
    "1_5": "var(--spacing-1-5)",
    "2": "var(--spacing-2)",
    "3": "var(--spacing-3)",
    "4": "var(--spacing-4)",
    "6": "var(--spacing-6)",
    "8": "var(--spacing-8)",
  },
  typography: {
    xs: "var(--type-xs)",
    sm: "var(--type-sm)",
    md: "var(--type-md)",
    lg: "var(--type-lg)",
    xl: "var(--type-xl)",
    lineHeight: {
      tight: "var(--line-tight)",
      normal: "var(--line-normal)",
      relaxed: "var(--line-relaxed)",
    },
  },
  color: {
    primary: "var(--color-primary)",
    onPrimary: "var(--color-on-primary)",
    surface: "var(--color-surface)",
    onSurface: "var(--color-on-surface)",
    background: "var(--color-background)",
    onBackground: "var(--color-on-background)",
    error: "var(--color-error)",
    onError: "var(--color-on-error)",
    star: "var(--color-star)",
    outline: "var(--color-outline)",
    overlay: "var(--color-overlay)",
  },
  radius: {
    sm: "var(--radius-sm)",
    md: "var(--radius-md)",
    lg: "var(--radius-lg)",
  },
  elevation: {
    "0": "var(--elevation-0)",
    "1": "var(--elevation-1)",
    "2": "var(--elevation-2)",
    "3": "var(--elevation-3)",
    "4": "var(--elevation-4)",
    "5": "var(--elevation-5)",
  },
  breakpoints: {
    xs: "var(--breakpoint-xs)",
    sm: "var(--breakpoint-sm)",
    md: "var(--breakpoint-md)",
    lg: "var(--breakpoint-lg)",
    xl: "var(--breakpoint-xl)",
  },
} as const;
