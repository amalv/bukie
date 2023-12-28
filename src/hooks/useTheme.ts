import { createTheme } from "@mui/material";
import { useReactiveVar } from "@apollo/client";
import { darkModeVar } from "../apolloClient";
import { getThemeConfig } from "./themeConfig";

export const useTheme = () => {
  const darkMode = useReactiveVar(darkModeVar);
  const theme = createTheme(getThemeConfig(darkMode));
  return theme;
};
