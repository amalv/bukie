import { describe, expect, it } from "vitest";
import { lightThemeClass, tokens } from "./tokens.css";

describe("design tokens module", () => {
  it("exports a theme class and a typed contract", () => {
    expect(typeof lightThemeClass).toBe("string");
    expect(tokens).toBeDefined();
    // leaf values resolve to CSS var() references as strings
    expect(typeof tokens.spacing["1"]).toBe("string");
    expect(tokens.spacing["1"]).toMatch(/^var\(/);
  });
});
