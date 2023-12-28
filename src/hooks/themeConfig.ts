import { getPaletteConfig } from "./paletteConfig";
import { getComponentsConfig } from "./componentsConfig";

export const getThemeConfig = (darkMode: boolean) => ({
  palette: getPaletteConfig(darkMode),
  components: getComponentsConfig(),
});
