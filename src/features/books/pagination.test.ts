import { describe, expect, it } from "vitest";
import { decodeCursor, encodeCursor } from "./pagination";

describe("decodeCursor edge cases", () => {
  it("returns undefined for null input", () => {
    expect(decodeCursor(null)).toBeNull();
  });

  it("returns undefined for invalid input", () => {
    expect(decodeCursor("not-a-cursor")).toBeNull();
  });

  it("decodes a valid cursor", () => {
    const cursor = encodeCursor({ id: "foo" });
    expect(decodeCursor(cursor)).toEqual({ id: "foo" });
  });
});
