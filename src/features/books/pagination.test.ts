import { describe, expect, it } from "vitest";
import { decodeCursor, encodeCursor } from "./pagination";

describe("catalog cursors", () => {
  it("round-trips sort title and work ID", () => {
    const value = { sortTitle: "example work", id: "work-id" };
    expect(decodeCursor(encodeCursor(value))).toEqual(value);
  });

  it("rejects legacy and malformed cursors", () => {
    expect(
      decodeCursor(Buffer.from('{"id":"old"}').toString("base64url")),
    ).toBeNull();
    expect(decodeCursor("not-base64-json")).toBeNull();
  });
});
