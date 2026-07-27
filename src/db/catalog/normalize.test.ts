import { describe, expect, it } from "vitest";
import {
  isGeneratedLegacyDescription,
  isProviderNeutralCoverKey,
  normalizeSortText,
  normalizeValidIsbn,
  parsePartialDate,
} from "./normalize";

describe("catalog normalization", () => {
  it("normalizes sort text without using it as identity", () => {
    expect(normalizeSortText("  À Tale—of Two Cities  ")).toBe(
      "a tale of two cities",
    );
  });

  it("parses year, month, and day precision without inventing display detail", () => {
    expect(parsePartialDate("1965")).toEqual({
      value: "1965",
      precision: "year",
      sortDate: "1965-01-01",
    });
    expect(parsePartialDate("1965-06")).toEqual({
      value: "1965-06",
      precision: "month",
      sortDate: "1965-06-01",
    });
    expect(parsePartialDate("1965-06-12")).toEqual({
      value: "1965-06-12",
      precision: "day",
      sortDate: "1965-06-12",
    });
    expect(parsePartialDate("1965-02-30")).toBeNull();
    expect(parsePartialDate("1965-13")).toBeNull();
  });

  it("projects only valid normalized ISBN values", () => {
    expect(normalizeValidIsbn("978-0-441-17271-9")).toEqual({
      scheme: "isbn13",
      value: "9780441172719",
    });
    expect(normalizeValidIsbn("0-8044-2957-X")).toEqual({
      scheme: "isbn10",
      value: "080442957X",
    });
    expect(normalizeValidIsbn("9780000000000")).toBeNull();
  });

  it("accepts only provider-neutral cover object keys", () => {
    expect(isProviderNeutralCoverKey("/covers/book.webp")).toBe(true);
    expect(isProviderNeutralCoverKey("https://images.example/book.webp")).toBe(
      false,
    );
    expect(isProviderNeutralCoverKey("../covers/book.webp")).toBe(false);
  });

  it("recognizes the catalog generator's exact fallback description", () => {
    expect(
      isGeneratedLegacyDescription({
        description: "A notable fantasy book by Mira Vale.",
        genre: "Fantasy",
        author: "Mira Vale",
      }),
    ).toBe(true);
    expect(
      isGeneratedLegacyDescription({
        description: "A hand-written description.",
        genre: "Fantasy",
        author: "Mira Vale",
      }),
    ).toBe(false);
  });
});
