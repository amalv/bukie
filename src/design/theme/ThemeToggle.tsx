"use client";

import Moon from "lucide-react/dist/esm/icons/moon.js";
import Sun from "lucide-react/dist/esm/icons/sun.js";
import { useEffect, useState, useTransition } from "react";
import { darkThemeClass, lightThemeClass } from "@/design/tokens";
import { setTheme } from "./actions";

export function ThemeToggle() {
  const [mode, setMode] = useState<"light" | "dark">("light");
  const [isPending, startTransition] = useTransition();

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
    const next = mode === "dark" ? "light" : "dark";
    setMode(next);
    apply(next);
    startTransition(() => setTheme(next));
  }

  const label =
    mode === "dark" ? "Switch to light mode" : "Switch to dark mode";

  return (
    <button
      type="button"
      aria-pressed={mode === "dark"}
      aria-label={label}
      onClick={onToggle}
      disabled={isPending}
      className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-[color:var(--color-outline)] bg-[var(--color-surface)] text-[var(--color-on-surface)] shadow-[0_2px_10px_rgba(15,23,42,0.08)] transition-[background,box-shadow,border-color,transform] duration-150 ease-out hover:-translate-y-px hover:bg-[var(--color-overlay)] hover:shadow-[0_6px_18px_rgba(15,23,42,0.12)] focus-visible:-translate-y-px focus-visible:bg-[var(--color-overlay)] focus-visible:shadow-[0_6px_18px_rgba(15,23,42,0.12)] focus-visible:outline-none aria-pressed:shadow-[0_8px_20px_rgba(15,23,42,0.16)] disabled:cursor-not-allowed disabled:opacity-70"
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
