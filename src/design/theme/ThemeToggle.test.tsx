import { act, fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { ThemeToggle } from "./ThemeToggle";

vi.mock("./actions", () => ({ setTheme: vi.fn() }));

describe("ThemeToggle", () => {
  it("renders and toggles theme", async () => {
    document.documentElement.setAttribute("data-theme", "dark");
    await act(async () => {
      render(<ThemeToggle />);
    });
    const btn = screen.getByRole("button");
    expect(btn.getAttribute("aria-pressed")).toBe("true");
    expect(screen.getByText(/switch to light mode/i)).toBeTruthy();
    await act(async () => {
      fireEvent.click(btn);
    });
    expect(document.documentElement.getAttribute("data-theme")).toBe("light");
    expect(btn.getAttribute("aria-pressed")).toBe("false");
    expect(screen.getByText(/switch to dark mode/i)).toBeTruthy();
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
