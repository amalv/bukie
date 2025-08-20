import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";
import RootLayout from "./layout";

vi.mock("next/font/google", () => ({
  Geist: () => ({ variable: "font-geist-sans" }),
  Geist_Mono: () => ({ variable: "font-geist-mono" }),
}));

vi.mock("next/headers", () => ({
  cookies: () =>
    Promise.resolve({
      get: vi.fn().mockReturnValue(undefined),
    }),
}));

describe("RootLayout", () => {
  it("renders children and applies global styles", async () => {
    // RootLayout is an async component; invoke it directly and await its result
    type Props = Readonly<{ children: React.ReactNode }>;
    const props: Props = { children: <div data-testid="child">Hello</div> };
    const tree = await RootLayout(props);
    const html = renderToStaticMarkup(tree as React.ReactElement);
    expect(html).toContain('data-testid="child"');
    expect(html).toMatch(/font-geist-sans/);
    expect(html).toMatch(/font-geist-mono/);
  });
});
