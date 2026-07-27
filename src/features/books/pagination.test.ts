import { describe, expect, it } from "vitest";
import { decodeCursor, encodeCursor } from "./pagination";

describe("catalog cursors", () => {
  it.each([
    {
      version: 1 as const,
      sort: "title" as const,
      sortTitle: "example work",
      id: "work-id",
    },
    {
      version: 1 as const,
      sort: "added" as const,
      catalogedAt: 123,
      id: "work-id",
    },
    {
      version: 1 as const,
      sort: "publication" as const,
      publicationSortDate: null,
      id: "work-id",
    },
  ])("round-trips a $sort cursor", (value) => {
    expect(decodeCursor(encodeCursor(value), value.sort)).toEqual(value);
  });

  it("rejects legacy and malformed cursors", () => {
    expect(
      decodeCursor(Buffer.from('{"id":"old"}').toString("base64url")),
    ).toBeNull();
    expect(decodeCursor("not-base64-json")).toBeNull();
    expect(
      decodeCursor(
        Buffer.from(
          '{"version":1,"sort":"title","sortTitle":"valid","id":""}',
        ).toString("base64url"),
      ),
    ).toBeNull();
  });

  it("rejects a cursor created for a different sort", () => {
    const cursor = encodeCursor({
      version: 1,
      sort: "title",
      sortTitle: "example",
      id: "work-id",
    });
    expect(decodeCursor(cursor, "publication")).toBeNull();
  });
});
