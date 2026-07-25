import { act, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import { darkThemeClass, lightThemeClass } from "@/design/tokens";
import { ThemeToggle } from "./ThemeToggle";

afterEach(() => {
  // biome-ignore lint/suspicious/noDocumentCookie: The test clears the regular cookie used by the server-rendered layout.
  document.cookie = "theme=; Path=/; Max-Age=0";
  document.documentElement.removeAttribute("data-theme");
  document.body.classList.remove(lightThemeClass, darkThemeClass);
});

describe("ThemeToggle", () => {
  it("toggles immediately, remains enabled, and persists the preference", async () => {
    document.documentElement.setAttribute("data-theme", "dark");
    document.body.classList.add(darkThemeClass);
    await act(async () => {
      render(<ThemeToggle />);
    });
    const btn = screen.getByRole("button", { name: /switch to light mode/i });
    expect(btn).toBeEnabled();
    expect(btn).toHaveAttribute("aria-pressed", "true");

    await act(async () => {
      fireEvent.click(btn);
    });

    expect(document.documentElement.getAttribute("data-theme")).toBe("light");
    expect(document.body).toHaveClass(lightThemeClass);
    expect(document.body).not.toHaveClass(darkThemeClass);
    expect(btn).toBeEnabled();
    expect(btn).toHaveAttribute("aria-pressed", "false");
    expect(btn).toHaveAccessibleName(/switch to dark mode/i);
    expect(document.cookie).toContain("theme=light");
  });

  it("uses explicit pointer, hover, and focus-visible affordances", async () => {
    document.documentElement.setAttribute("data-theme", "light");
    await act(async () => {
      render(<ThemeToggle />);
    });

    const btn = screen.getByRole("button");
    expect(btn).toHaveClass("cursor-pointer");
    expect(btn.className).toContain(
      "hover:border-[color:var(--color-primary)]",
    );
    expect(btn.className).toContain(
      "focus-visible:outline-[color:var(--color-primary)]",
    );
    expect(btn.className).not.toContain("cursor-not-allowed");
  });

  it("renders correct icon for each mode", async () => {
    document.documentElement.setAttribute("data-theme", "light");
    await act(async () => {
      render(<ThemeToggle />);
    });
    expect(screen.getByLabelText(/switch to dark mode/i)).toBeTruthy();
    document.documentElement.setAttribute("data-theme", "dark");
    await act(async () => {
      render(<ThemeToggle />);
    });
    expect(screen.getByLabelText(/switch to light mode/i)).toBeTruthy();
  });
});
