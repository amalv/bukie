import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import Header from "./Header";

describe("Header", () => {
  it("renders header with Bukie and ThemeToggle", () => {
    render(<Header />);
    expect(screen.getByText("Bukie")).toBeTruthy();
    expect(screen.getByRole("banner")).toBeTruthy();
    // ThemeToggle button should be present
    expect(screen.getByRole("button")).toBeTruthy();
  });
});
