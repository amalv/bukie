import { describe, expect, it } from "vitest";
import {
  catalogQueryKey,
  parseCatalogQuery,
  publicationPeriodBounds,
  serializeCatalogPageQuery,
  serializeCatalogQuery,
} from "./catalogQuery";

describe("canonical catalog query", () => {
  it("parses and normalizes every supported parameter", () => {
    expect(
      parseCatalogQuery({
        q: "  ursula   le guin ",
        category: " Science-Fiction ",
        period: "1950-1999",
        sort: "publication",
      }),
    ).toEqual({
      q: "ursula le guin",
      category: "science-fiction",
      period: "1950-1999",
      sort: "publication",
    });
  });

  it("uses safe defaults for invalid and repeated parameters", () => {
    expect(
      parseCatalogQuery({
        q: ["first", "second"],
        category: "../invalid",
        period: "future",
        sort: "relevance",
      }),
    ).toEqual({
      q: "first",
      category: undefined,
      period: undefined,
      sort: "title",
    });
  });

  it("serializes in one stable canonical order and omits defaults", () => {
    const parsed = parseCatalogQuery(
      new URLSearchParams(
        "sort=publication&period=2000-2009&category=fantasy&q=harbor",
      ),
    );
    expect(serializeCatalogQuery(parsed).toString()).toBe(
      "q=harbor&category=fantasy&period=2000-2009&sort=publication",
    );
    expect(
      serializeCatalogQuery(
        parseCatalogQuery(new URLSearchParams()),
      ).toString(),
    ).toBe("");
    expect(catalogQueryKey(parsed)).toBe(
      "q=harbor&category=fantasy&period=2000-2009&sort=publication",
    );
  });

  it("uses the same model for paginated API parameters", () => {
    const query = parseCatalogQuery(
      new URLSearchParams("category=classics&sort=added"),
    );
    expect(
      serializeCatalogPageQuery(query, {
        after: "opaque-cursor",
        limit: 24,
      }).toString(),
    ).toBe("category=classics&sort=added&after=opaque-cursor&limit=24");
  });

  it("exposes inclusive and exclusive publication-period bounds", () => {
    expect(publicationPeriodBounds("1950-1999")).toEqual({
      from: "1950-01-01",
      before: "2000-01-01",
    });
    expect(publicationPeriodBounds("2020-present")).toEqual({
      from: "2020-01-01",
      before: undefined,
    });
  });
});
