import { describe, expect, it } from "vitest";
import {
  persistThemePreference,
  serializeThemeCookie,
  themeCookieMaxAge,
} from "./preference";

describe("theme preference cookie", () => {
  it("serializes the browser-readable preference for HTTP", () => {
    expect(serializeThemeCookie("light", false)).toBe(
      `theme=light; Path=/; Max-Age=${themeCookieMaxAge}; SameSite=Lax`,
    );
  });

  it("marks the preference secure over HTTPS", () => {
    expect(serializeThemeCookie("dark", true)).toBe(
      `theme=dark; Path=/; Max-Age=${themeCookieMaxAge}; SameSite=Lax; Secure`,
    );
  });

  it("persists the preference for the next server render", () => {
    persistThemePreference("dark");

    expect(document.cookie).toContain("theme=dark");
  });
});
