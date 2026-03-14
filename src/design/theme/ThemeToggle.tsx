"use client";

import Moon from "lucide-react/dist/esm/icons/moon.js";
import Sun from "lucide-react/dist/esm/icons/sun.js";
import { useEffect, useState, useTransition } from "react";
import { darkThemeClass, lightThemeClass } from "@/design/tokens.css";
import { setTheme } from "./actions";
import * as s from "./toggle.css";

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
      className={s.button}
    >
      <span className={s.srOnly}>{label}</span>
      {mode === "dark" ? (
        <Sun className={s.icon} />
      ) : (
        <Moon className={s.icon} />
      )}
    </button>
  );
}
