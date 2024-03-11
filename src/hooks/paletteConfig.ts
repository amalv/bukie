import type { PaletteOptions } from "@mui/material";

export const getPaletteConfig = (darkMode: boolean): PaletteOptions => ({
  mode: darkMode ? "dark" : "light",
  primary: {
    light: "#f5deb3", // wheat color
    main: "#f5deb3",
    dark: "#d2b48c", // tan color
    contrastText: "#000", // black text for contrast
  },
  secondary: {
    light: "#90ee90", // light green
    main: "#90ee90",
    dark: "#3cb371", // medium sea green
    contrastText: "#000", // black text for contrast
  },
});
