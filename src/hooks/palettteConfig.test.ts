import { getPaletteConfig } from "./paletteConfig";

describe("getPaletteConfig", () => {
  it("returns dark mode palette configuration when darkMode is true", () => {
    const result = getPaletteConfig(true);
    expect(result).toEqual({
      mode: "dark",
      primary: {
        light: "#f5deb3",
        main: "#f5deb3",
        dark: "#d2b48c",
        contrastText: "#000",
      },
      secondary: {
        light: "#90ee90",
        main: "#90ee90",
        dark: "#3cb371",
        contrastText: "#000",
      },
    });
  });

  it("returns light mode palette configuration when darkMode is false", () => {
    const result = getPaletteConfig(false);
    expect(result).toEqual({
      mode: "light",
      primary: {
        light: "#f5deb3",
        main: "#f5deb3",
        dark: "#d2b48c",
        contrastText: "#000",
      },
      secondary: {
        light: "#90ee90",
        main: "#90ee90",
        dark: "#3cb371",
        contrastText: "#000",
      },
    });
  });
});
