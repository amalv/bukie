import { describe, expect, it } from "vitest";
import { createExistingBookMatcher } from "./match";

describe("createExistingBookMatcher", () => {
  it("matches existing books by normalized ISBN first", () => {
    const match = createExistingBookMatcher([
      {
        id: "book-1",
        title: "Dune",
        author: "Frank Herbert",
        isbn: "978-0-441-17271-9",
      },
    ]);

    expect(
      match({
        title: "Dune",
        author: "Frank Herbert",
        isbn: "9780441172719",
      }),
    ).toBe("book-1");
  });

  it("falls back to normalized title and author when ISBN is missing", () => {
    const match = createExistingBookMatcher([
      {
        id: "book-2",
        title: "  The Left Hand of Darkness ",
        author: "Ursula K. Le Guin",
        isbn: undefined,
      },
    ]);

    expect(
      match({
        title: "the left hand of darkness",
        author: "ursula k. le guin",
      }),
    ).toBe("book-2");
  });

  it("returns undefined when there is no match", () => {
    const match = createExistingBookMatcher([
      {
        id: "book-3",
        title: "Foundation",
        author: "Isaac Asimov",
        isbn: "9780553293357",
      },
    ]);

    expect(
      match({
        title: "Hyperion",
        author: "Dan Simmons",
        isbn: "9780553283686",
      }),
    ).toBeUndefined();
  });
});
