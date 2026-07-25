export type ThemePreference = "light" | "dark";

export const themeCookieMaxAge = 60 * 60 * 24 * 365;

export function serializeThemeCookie(theme: ThemePreference, secure: boolean) {
  return [
    `theme=${theme}`,
    "Path=/",
    `Max-Age=${themeCookieMaxAge}`,
    "SameSite=Lax",
    secure ? "Secure" : null,
  ]
    .filter(Boolean)
    .join("; ");
}

export function persistThemePreference(theme: ThemePreference) {
  // biome-ignore lint/suspicious/noDocumentCookie: Cookie Store is not consistently available, and SSR reads this regular cookie.
  document.cookie = serializeThemeCookie(
    theme,
    window.location.protocol === "https:",
  );
}
