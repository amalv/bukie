import { createTheme } from "@mui/material";
import { useReactiveVar } from "@apollo/client";
import { darkModeVar } from "../apolloClient";

export const useTheme = () => {
  const darkMode = useReactiveVar(darkModeVar) as boolean;

  const theme = createTheme({
    palette: {
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
    },
    components: {
      MuiAvatar: {
        styleOverrides: {
          root: {
            backgroundColor: "#f5deb3", // wheat color
            cursor: "pointer",
          },
        },
      },
      MuiListItemButton: {
        styleOverrides: {
          root: {
            cursor: "pointer",
          },
        },
      },
    },
  });

  return theme;
};
