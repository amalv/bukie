import { vi } from "vitest";
import { render, fireEvent, screen } from "@testing-library/react";
import { useReactiveVar } from "@apollo/client";

import { ThemeSwitch } from "./ThemeSwitch";

vi.mock("@apollo/client", () => ({
  useReactiveVar: vi.fn(),
}));

vi.mock("../../../../apolloClient", () => ({
  darkModeVar: vi.fn(),
}));

describe("ThemeSwitch", () => {
  beforeEach(() => {
    vi.stubGlobal("localStorage", {
      getItem: vi.fn(),
      setItem: vi.fn(),
    });
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("toggles theme on switch click", async () => {
    const mockDarkModeVar = false;
    (useReactiveVar as jest.Mock).mockReturnValue(mockDarkModeVar);

    render(<ThemeSwitch />);

    await fireEvent.click(screen.getByRole("checkbox"));

    expect(useReactiveVar).toHaveBeenCalled();
    expect(localStorage.setItem).toHaveBeenCalledWith("theme", "dark");
  });

  it("reads the saved theme from localStorage on mount", () => {
    const getItemMock = vi.fn().mockReturnValue("dark");
    vi.stubGlobal("localStorage", {
      getItem: getItemMock,
      setItem: vi.fn(),
    });

    render(<ThemeSwitch />);

    expect(getItemMock).toHaveBeenCalledWith("theme");
    expect(useReactiveVar).toHaveBeenCalled();
  });
});
