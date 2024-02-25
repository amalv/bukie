import { getComponentsConfig } from "./componentsConfig";
import { getPaletteConfig } from "./paletteConfig";

export const getThemeConfig = (darkMode: boolean) => ({
  palette: getPaletteConfig(darkMode),
  components: getComponentsConfig(),
});
