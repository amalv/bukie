import { describe, expect, it } from "vitest";
import { formatCount, formatOneDecimal } from "./rating";

describe("rating helpers", () => {
  it("formats one decimal and clamps values", () => {
    expect(formatOneDecimal(4.256)).toBe("4.3");
    expect(formatOneDecimal(5.9)).toBe("5.0");
    expect(formatOneDecimal(-1)).toBe("0.0");
  });

  it("formats counts using Intl", () => {
    expect(formatCount(1000, "en-US")).toBe("1,000");
    // fallback locale
    expect(formatCount(1234)).toBeTruthy();
  });
});
