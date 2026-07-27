import { describe, expect, it } from "vitest";
import type { CatalogQuery } from "./catalogQuery";
import { decodeCursor, encodeCursor } from "./pagination";

describe("catalog cursors", () => {
  it.each([
    {
      query: { sort: "title" } satisfies CatalogQuery,
      payload: {
        version: 2 as const,
        queryKey: "",
        sort: "title" as const,
        sortTitle: "example work",
        id: "work-id",
      },
    },
    {
      query: { sort: "added" } satisfies CatalogQuery,
      payload: {
        version: 2 as const,
        queryKey: "sort=added",
        sort: "added" as const,
        catalogedAt: 123,
        id: "work-id",
      },
    },
    {
      query: { sort: "publication" } satisfies CatalogQuery,
      payload: {
        version: 2 as const,
        queryKey: "sort=publication",
        sort: "publication" as const,
        publicationSortDate: null,
        id: "work-id",
      },
    },
  ])("round-trips a $payload.sort cursor", ({ payload, query }) => {
    expect(decodeCursor(encodeCursor(payload), query)).toEqual(payload);
  });

  it("rejects legacy and malformed cursors", () => {
    expect(
      decodeCursor(Buffer.from('{"id":"old"}').toString("base64url")),
    ).toBeNull();
    expect(decodeCursor("not-base64-json")).toBeNull();
    expect(
      decodeCursor(
        Buffer.from(
          '{"version":2,"queryKey":"","sort":"title","sortTitle":"valid","id":""}',
        ).toString("base64url"),
      ),
    ).toBeNull();
  });

  it("rejects a cursor created for a different sort", () => {
    const cursor = encodeCursor({
      version: 2,
      queryKey: "",
      sort: "title",
      sortTitle: "example",
      id: "work-id",
    });
    expect(decodeCursor(cursor, { sort: "publication" })).toBeNull();
  });

  it("rejects a cursor created for different filters with the same sort", () => {
    const cursor = encodeCursor({
      version: 2,
      queryKey: "category=science-fiction",
      sort: "title",
      sortTitle: "example",
      id: "work-id",
    });
    expect(
      decodeCursor(cursor, { category: "fantasy", sort: "title" }),
    ).toBeNull();
  });
});
