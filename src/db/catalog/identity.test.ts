import { describe, expect, it } from "vitest";
import {
  BUKIE_CATALOG_NAMESPACE,
  canonicalJson,
  deterministicCatalogId,
  hashCanonicalJson,
  newCatalogId,
  uuidV5,
} from "./identity";

describe("catalog identity", () => {
  it("generates stable RFC 4122 UUIDv5 identities in the fixed namespace", () => {
    expect(uuidV5("work:legacy_catalog:book-1")).toBe(
      "c34bfdec-c0af-571c-b1c1-d96c7a8e5fe9",
    );
    expect(deterministicCatalogId("work", "legacy_catalog", "book-1")).toBe(
      "c34bfdec-c0af-571c-b1c1-d96c7a8e5fe9",
    );
    expect(BUKIE_CATALOG_NAMESPACE).toMatch(
      /^[0-9a-f]{8}-[0-9a-f]{4}-5[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/,
    );
  });

  it("uses UUIDv4 for entities without stable source identity", () => {
    const first = newCatalogId();
    const second = newCatalogId();
    expect(first).not.toBe(second);
    expect(first).toMatch(
      /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/,
    );
  });

  it("canonicalizes object keys recursively before hashing", () => {
    const left = { z: [{ b: 2, a: 1 }], a: "value", omitted: undefined };
    const right = { a: "value", z: [{ a: 1, b: 2 }] };
    expect(canonicalJson(left)).toBe(canonicalJson(right));
    expect(hashCanonicalJson(left)).toBe(hashCanonicalJson(right));
    expect(hashCanonicalJson(left)).toHaveLength(64);
  });
});
