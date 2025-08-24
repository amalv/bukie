import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";

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
    // import after mocks so module-level code runs under the mocked modules
    vi.resetModules();
    const { default: RootLayout } = await import("./layout");
    const tree = await RootLayout(props as Props);
    const html = renderToStaticMarkup(tree as React.ReactElement);
    expect(html).toContain('data-testid="child"');
    expect(html).toMatch(/font-geist-sans/);
    expect(html).toMatch(/font-geist-mono/);
  });

  it("uses dark theme when cookie is set", async () => {
    vi.doMock("next/headers", () => ({
      cookies: () =>
        Promise.resolve({ get: vi.fn().mockReturnValue({ value: "dark" }) }),
    }));
    type Props = Readonly<{ children: React.ReactNode }>;
    const props: Props = { children: <div /> };
    // reset module registry so the layout module re-evaluates under the new mock
    vi.resetModules();
    const { default: ReRoot } = await import("./layout");
    const tree = await ReRoot(props as Props);
    const html = renderToStaticMarkup(tree as React.ReactElement);
    expect(html).toMatch(/data-theme="dark"/);
  });

  it("uses light theme when cookie is set", async () => {
    vi.doMock("next/headers", () => ({
      cookies: () =>
        Promise.resolve({ get: vi.fn().mockReturnValue({ value: "light" }) }),
    }));
    vi.resetModules();
    const { default: ReRoot } = await import("./layout");
    type Props = Readonly<{ children: React.ReactNode }>;
    const props: Props = { children: <div /> };
    const tree = await ReRoot(props);
    const html = renderToStaticMarkup(tree as React.ReactElement);
    expect(html).toMatch(/data-theme="light"/);
  });
});
