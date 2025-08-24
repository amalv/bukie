import { describe, expect, it } from "vitest";
import { decodeCursor, encodeCursor } from "./pagination";

describe("pagination cursors", () => {
  it("returns null for falsy or invalid cursor", () => {
    expect(decodeCursor(undefined)).toBeNull();
    expect(decodeCursor(null)).toBeNull();
    expect(decodeCursor("not-base64")).toBeNull();
  });

  it("roundtrips an encoded cursor", () => {
    const cur = encodeCursor({ id: "abc" });
    expect(decodeCursor(cur)).toEqual({ id: "abc" });
  });

  it("returns null when cursor decodes to invalid JSON", () => {
    // base64url for '{ invalid json'
    const bad = Buffer.from("{ invalid json", "utf8").toString("base64url");
    expect(decodeCursor(bad)).toBeNull();
  });

  it("returns null when decoded object has no id string", () => {
    const json = JSON.stringify({ foo: "bar" });
    const cur = Buffer.from(json, "utf8").toString("base64url");
    expect(decodeCursor(cur)).toBeNull();
  });
});
