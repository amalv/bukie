import { describe, expect, it } from "vitest";
import {
  presentAuthors,
  presentBibliographicMeta,
  presentRating,
} from "./presentation";

describe("book presentation", () => {
  it("preserves ordered authors and summarizes credits after the first two", () => {
    expect(
      presentAuthors({
        id: "1",
        title: "Work",
        author: "Fallback",
        authors: ["One", "Two", "Three", "Four"],
        cover: "",
      }),
    ).toEqual({
      full: "One, Two, Three, Four",
      visible: "One · Two and 2 more",
      truncated: true,
    });
  });

  it("falls back to the scalar author and ignores empty values", () => {
    expect(
      presentAuthors({
        id: "1",
        title: "Work",
        author: "  Author  ",
        cover: "",
      }),
    ).toEqual({
      full: "Author",
      visible: "Author",
      truncated: false,
    });
    expect(
      presentAuthors({
        id: "2",
        title: "Work",
        author: " ",
        authors: [" ", ""],
        cover: "",
      }),
    ).toBeUndefined();
  });

  it("joins only supported bibliographic metadata", () => {
    expect(
      presentBibliographicMeta({
        id: "1",
        title: "Work",
        author: "Author",
        cover: "",
        genre: "Science Fiction",
        year: 1984,
      }),
    ).toBe("Science Fiction · 1984");
    expect(
      presentBibliographicMeta({
        id: "2",
        title: "Work",
        author: "Author",
        cover: "",
      }),
    ).toBeUndefined();
  });

  it("requires an explicit eligible rating and always includes its sample", () => {
    expect(presentRating(undefined)).toBeUndefined();
    expect(presentRating({ state: "unrated" })).toEqual({
      accessible: "Not rated",
      visible: "Not rated",
    });
    expect(presentRating({ state: "unavailable" })).toEqual({
      accessible: "Rating unavailable",
      visible: "Rating unavailable",
    });
    expect(
      presentRating({ state: "eligible", average: 4.46, count: 12847 }),
    ).toEqual({
      accessible: "Rating 4.5 out of 5 from 12,847 ratings",
      visible: "4.5 · 12,847 ratings",
    });
    expect(
      presentRating({ state: "eligible", average: 4.46, count: 0 }),
    ).toEqual({
      accessible: "Not rated",
      visible: "Not rated",
    });
  });
});
