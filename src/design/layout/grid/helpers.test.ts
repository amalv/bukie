import { describe, expect, it } from "vitest";
import { resolveSpanClasses } from "./helpers";

describe("resolveSpanClasses", () => {
  it("returns a single class for numeric span (base)", () => {
    const span = 6;

    const classes = resolveSpanClasses(span);

    expect(Array.isArray(classes)).toBe(true);
    expect(classes.length).toBe(1);
    expect(typeof classes[0]).toBe("string");
  });

  it("returns classes for responsive object spans", () => {
    const span = { base: 12, sm: 6, md: 4 } as const;

    const classes = resolveSpanClasses(span);

    expect(classes.length).toBe(3);
    classes.forEach((c) => {
      expect(typeof c).toBe("string");
    });
  });
});

describe("resolveSpanClasses - branches", () => {
  it("handles base-only object and no props gracefully", () => {
    const classesBase = resolveSpanClasses({ base: 1 });
    expect(classesBase.length).toBe(1);

    const classesEmpty = resolveSpanClasses({});
    expect(classesEmpty.length).toBe(0);
  });

  it("clamps values below 1 and above 12 across breakpoints", () => {
    const classes = resolveSpanClasses({
      base: 0,
      sm: 99,
      md: -5,
      lg: 13,
      xl: 2,
    });
    expect(Array.isArray(classes)).toBe(true);
    expect(classes.length).toBeGreaterThan(0);
  });
});
