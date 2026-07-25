"use client";

import Moon from "lucide-react/dist/esm/icons/moon.js";
import Sun from "lucide-react/dist/esm/icons/sun.js";
import { useEffect, useState } from "react";
import { darkThemeClass, lightThemeClass } from "@/design/tokens";
import { persistThemePreference } from "./preference";

export function ThemeToggle() {
  const [mode, setMode] = useState<"light" | "dark">("light");

  useEffect(() => {
    const current = document.documentElement.getAttribute("data-theme");
    if (current === "dark" || current === "light") setMode(current);
  }, []);

  function apply(next: "light" | "dark") {
    document.documentElement.setAttribute("data-theme", next);
    document.body.classList.remove(lightThemeClass, darkThemeClass);
    document.body.classList.add(
      next === "dark" ? darkThemeClass : lightThemeClass,
    );
  }

  function onToggle() {
    const current =
      document.documentElement.getAttribute("data-theme") === "dark"
        ? "dark"
        : "light";
    const next = current === "dark" ? "light" : "dark";
    setMode(next);
    apply(next);
    persistThemePreference(next);
  }

  const label =
    mode === "dark" ? "Switch to light mode" : "Switch to dark mode";

  return (
    <button
      type="button"
      aria-pressed={mode === "dark"}
      aria-label={label}
      onClick={onToggle}
      className="inline-flex h-10 w-10 cursor-pointer items-center justify-center rounded-full border border-[color:var(--color-outline)] bg-[var(--color-surface)] text-[var(--color-on-surface)] shadow-[0_2px_10px_rgba(15,23,42,0.08)] transition-[background,box-shadow,border-color,transform] duration-150 ease-out hover:-translate-y-px hover:border-[color:var(--color-primary)] hover:bg-[color:color-mix(in_srgb,var(--color-primary)_14%,var(--color-surface))] hover:shadow-[0_6px_18px_rgba(15,23,42,0.12)] focus-visible:-translate-y-px focus-visible:border-[color:var(--color-primary)] focus-visible:bg-[color:color-mix(in_srgb,var(--color-primary)_14%,var(--color-surface))] focus-visible:shadow-[0_6px_18px_rgba(15,23,42,0.12)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[color:var(--color-primary)] active:translate-y-0 aria-pressed:shadow-[0_8px_20px_rgba(15,23,42,0.16)]"
    >
      <span className="sr-only">{label}</span>
      {mode === "dark" ? (
        <Sun className="h-[1.05rem] w-[1.05rem] opacity-90" />
      ) : (
        <Moon className="h-[1.05rem] w-[1.05rem] opacity-90" />
      )}
    </button>
  );
}
