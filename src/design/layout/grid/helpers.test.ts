import { describe, expect, it } from "vitest";
import { resolveSpanStyle } from "./helpers";

describe("resolveSpanStyle", () => {
  it("returns a base CSS variable for numeric span", () => {
    const span = 6;

    const style = resolveSpanStyle(span);

    expect(style["--col-base"]).toBe("6");
  });

  it("returns CSS variables for responsive object spans", () => {
    const span = { base: 12, sm: 6, md: 4 } as const;

    const style = resolveSpanStyle(span);

    expect(style["--col-base"]).toBe("12");
    expect(style["--col-sm"]).toBe("6");
    expect(style["--col-md"]).toBe("4");
  });
});

describe("resolveSpanStyle - branches", () => {
  it("handles base-only object and no props gracefully", () => {
    const styleBase = resolveSpanStyle({ base: 1 });
    expect(styleBase["--col-base"]).toBe("1");

    const styleEmpty = resolveSpanStyle({});
    expect(Object.keys(styleEmpty).length).toBe(0);
  });

  it("clamps values below 1 and above 12 across breakpoints", () => {
    const style = resolveSpanStyle({
      base: 0,
      sm: 99,
      md: -5,
      lg: 13,
      xl: 2,
    });
    expect(style["--col-base"]).toBe("1");
    expect(style["--col-sm"]).toBe("12");
    expect(style["--col-md"]).toBe("1");
    expect(style["--col-lg"]).toBe("12");
    expect(style["--col-xl"]).toBe("2");
  });
});
