import { useEffect } from "react";
import { Switch, FormControlLabel } from "@mui/material";
import { useReactiveVar } from "@apollo/client";
import Brightness4 from "@mui/icons-material/Brightness4";
import Brightness7 from "@mui/icons-material/Brightness7";

import { darkModeVar } from "../../../../apolloClient";

export const ThemeSwitch = () => {
  const darkMode = useReactiveVar(darkModeVar);

  useEffect(() => {
    const savedTheme = localStorage.getItem("theme");
    if (savedTheme) {
      darkModeVar(savedTheme === "dark");
    }
  }, []);

  const handleThemeChange = () => {
    const newDarkMode = !darkMode;
    darkModeVar(newDarkMode);
    localStorage.setItem("theme", newDarkMode ? "dark" : "light");
  };

  return (
    <FormControlLabel
      control={<Switch checked={darkMode} onChange={handleThemeChange} />}
      label={darkMode ? <Brightness4 /> : <Brightness7 />}
      sx={{ mr: 0 }}
    />
  );
};
