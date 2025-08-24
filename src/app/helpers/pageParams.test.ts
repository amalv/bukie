import { describe, expect, it } from "vitest";
import { normalizeAfter, normalizeQ } from "./pageParams";

describe("pageParams helpers", () => {
  it("normalizeQ returns first element when array with value", () => {
    expect(normalizeQ(["a"])).toBe("a");
  });

  it("normalizeQ returns empty string when array empty or element undefined", () => {
    expect(normalizeQ([])).toBe("");
    expect(normalizeQ([undefined as unknown as string])).toBe("");
  });

  it("normalizeQ returns raw value or empty when undefined", () => {
    expect(normalizeQ("x")).toBe("x");
    expect(normalizeQ(undefined)).toBe("");
  });

  it("normalizeAfter returns first element or undefined for empty/undefined", () => {
    expect(normalizeAfter(["cursor-1"])).toBe("cursor-1");
    expect(normalizeAfter([])).toBeUndefined();
    expect(normalizeAfter(undefined)).toBeUndefined();
  });
});
