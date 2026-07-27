import { describe, expect, it } from "vitest";
import { normalizeAfter } from "./pageParams";

describe("pageParams helpers", () => {
  it("normalizeAfter returns first element or undefined for empty/undefined", () => {
    expect(normalizeAfter(["cursor-1"])).toBe("cursor-1");
    expect(normalizeAfter([])).toBeUndefined();
    expect(normalizeAfter(undefined)).toBeUndefined();
  });
});
