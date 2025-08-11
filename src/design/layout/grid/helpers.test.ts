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
    classes.forEach((c) => expect(typeof c).toBe("string"));
  });
});
