import "@testing-library/jest-dom";
import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import RootLayout from "./layout";

vi.mock("next/font/google", () => ({
  Geist: () => ({ variable: "font-geist-sans" }),
  Geist_Mono: () => ({ variable: "font-geist-mono" }),
}));

describe("RootLayout", () => {
  it("renders children and applies global styles", () => {
    render(
      <RootLayout>
        <div data-testid="child">Hello</div>
      </RootLayout>,
    );
    expect(screen.getByTestId("child")).toBeInTheDocument();
    expect(document.body.className).toMatch(/font-geist-sans/);
    expect(document.body.className).toMatch(/font-geist-mono/);
  });
});
