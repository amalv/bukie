"use client";

import { useEffect, useState, useTransition } from "react";
import { setTheme } from "./actions";

export function ThemeToggle() {
  const [mode, setMode] = useState<"light" | "dark">("light");
  const [isPending, startTransition] = useTransition();

  useEffect(() => {
    const current = document.documentElement.getAttribute("data-theme");
    if (current === "dark" || current === "light") setMode(current);
  }, []);

  function apply(mode: "light" | "dark") {
    document.documentElement.setAttribute("data-theme", mode);
  }

  function onToggle() {
    const next = mode === "dark" ? "light" : "dark";
    setMode(next);
    apply(next);
    startTransition(() => setTheme(next));
  }

  return (
    <button
      type="button"
      aria-pressed={mode === "dark"}
      aria-label={
        mode === "dark" ? "Switch to light mode" : "Switch to dark mode"
      }
      onClick={onToggle}
      disabled={isPending}
      style={{
        font: "inherit",
        padding: "0.5rem 0.75rem",
        borderRadius: 8,
        border: "1px solid currentColor",
        background: "transparent",
        cursor: "pointer",
      }}
    >
      {mode === "dark" ? "Dark" : "Light"}
    </button>
  );
}
