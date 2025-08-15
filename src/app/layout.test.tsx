import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";
import RootLayout from "./layout";

vi.mock("next/font/google", () => ({
  Geist: () => ({ variable: "font-geist-sans" }),
  Geist_Mono: () => ({ variable: "font-geist-mono" }),
}));

describe("RootLayout", () => {
  it("renders children and applies global styles", () => {
    const html = renderToStaticMarkup(
      <RootLayout>
        <div data-testid="child">Hello</div>
      </RootLayout>,
    );
    expect(html).toContain('data-testid="child"');
    expect(html).toMatch(/font-geist-sans/);
    expect(html).toMatch(/font-geist-mono/);
  });
});
