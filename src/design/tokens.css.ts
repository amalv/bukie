import { createTheme, createThemeContract } from "@vanilla-extract/css";

export const tokens = createThemeContract({
  spacing: {
    "0": null,
    "0_5": null, // 4px
    "1": null, // 8px
    "1_5": null, // 12px
    "2": null, // 16px
    "3": null, // 24px
    "4": null, // 32px
    "6": null, // 48px
    "8": null, // 64px
  },
  typography: {
    xs: null,
    sm: null,
    md: null,
    lg: null,
    xl: null,
    lineHeight: {
      tight: null,
      normal: null,
      relaxed: null,
    },
  },
  color: {
    primary: null,
    onPrimary: null,
    surface: null,
    onSurface: null,
    background: null,
    onBackground: null,
    error: null,
    onError: null,
    // Accent color for rating stars and similar UI affordances
    star: null,
    // Theme-aware outline/border color
    outline: null,
    // Subtle hover overlay color
    overlay: null,
  },
  radius: {
    sm: null,
    md: null,
    lg: null,
  },
  elevation: {
    "0": null,
    "1": null,
    "2": null,
    "3": null,
    "4": null,
    "5": null,
  },
  breakpoints: {
    xs: null,
    sm: null,
    md: null,
    lg: null,
    xl: null,
  },
});

export const lightThemeClass = createTheme(tokens, {
  spacing: {
    "0": "0px",
    "0_5": "0.25rem",
    "1": "0.5rem",
    "1_5": "0.75rem",
    "2": "1rem",
    "3": "1.5rem",
    "4": "2rem",
    "6": "3rem",
    "8": "4rem",
  },
  typography: {
    xs: "0.75rem",
    sm: "0.875rem",
    md: "1rem",
    lg: "1.25rem",
    xl: "1.5rem",
    lineHeight: {
      tight: "1.2",
      normal: "1.5",
      relaxed: "1.7",
    },
  },
  color: {
    primary: "#6750A4",
    onPrimary: "#FFFFFF",
    surface: "#FFFBFE",
    onSurface: "#1C1B1F",
    background: "#FFFFFF",
    onBackground: "#1C1B1F",
    error: "#B3261E",
    onError: "#FFFFFF",
    star: "#F59E0B", // amber-500
    outline: "rgba(0,0,0,0.12)",
    overlay: "rgba(0,0,0,0.04)",
  },
  radius: {
    sm: "4px",
    md: "8px",
    lg: "12px",
  },
  elevation: {
    "0": "none",
    "1": "0 1px 2px rgba(0,0,0,0.08)",
    "2": "0 2px 4px rgba(0,0,0,0.10)",
    "3": "0 4px 8px rgba(0,0,0,0.12)",
    "4": "0 8px 16px rgba(0,0,0,0.14)",
    "5": "0 12px 24px rgba(0,0,0,0.16)",
  },
  breakpoints: {
    xs: "0px",
    sm: "600px",
    md: "905px",
    lg: "1240px",
    xl: "1440px",
  },
});

export const darkThemeClass = createTheme(tokens, {
  spacing: {
    "0": "0px",
    "0_5": "0.25rem",
    "1": "0.5rem",
    "1_5": "0.75rem",
    "2": "1rem",
    "3": "1.5rem",
    "4": "2rem",
    "6": "3rem",
    "8": "4rem",
  },
  typography: {
    xs: "0.75rem",
    sm: "0.875rem",
    md: "1rem",
    lg: "1.25rem",
    xl: "1.5rem",
    lineHeight: {
      tight: "1.2",
      normal: "1.5",
      relaxed: "1.7",
    },
  },
  color: {
    primary: "#CFBCFF",
    onPrimary: "#1C1B1F",
    surface: "#1C1B1F",
    onSurface: "#E6E1E5",
    background: "#121212",
    onBackground: "#E6E1E5",
    error: "#F2B8B5",
    onError: "#1C1B1F",
    star: "#FBBF24", // amber-400
    outline: "rgba(255,255,255,0.20)",
    overlay: "rgba(255,255,255,0.08)",
  },
  radius: {
    sm: "4px",
    md: "8px",
    lg: "12px",
  },
  elevation: {
    "0": "none",
    "1": "0 1px 2px rgba(0,0,0,0.40)",
    "2": "0 2px 6px rgba(0,0,0,0.50)",
    "3": "0 4px 10px rgba(0,0,0,0.55)",
    "4": "0 8px 18px rgba(0,0,0,0.60)",
    "5": "0 12px 26px rgba(0,0,0,0.65)",
  },
  breakpoints: {
    xs: "0px",
    sm: "600px",
    md: "905px",
    lg: "1240px",
    xl: "1440px",
  },
});
