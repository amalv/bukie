import { beforeEach, describe, expect, it, vi } from "vitest";
import { DEFAULT_BOOKS_PAGE_SIZE } from "@/features/books/pageSize";
import * as repo from "@/features/books/repo";
import { workSummaryFixture } from "@/test/catalog-fixtures";
import { GET } from "./route";

describe("GET /api/books/page", () => {
  beforeEach(() => vi.restoreAllMocks());

  it("returns a normalized search page", async () => {
    const page = vi.spyOn(repo, "getWorksPage").mockResolvedValue({
      items: [workSummaryFixture],
      hasNext: true,
      nextCursor: "next",
      total: 30,
    });
    const response = await GET(
      new Request("https://test/api/books/page?q=work&after=cursor&limit=10"),
    );
    expect(await response.json()).toEqual({
      items: [workSummaryFixture],
      hasNext: true,
      nextCursor: "next",
      total: 30,
    });
    expect(page).toHaveBeenCalledWith({
      query: {
        q: "work",
        category: undefined,
        period: undefined,
        sort: "title",
      },
      after: "cursor",
      limit: 10,
    });
  });

  it("bounds oversized limits", async () => {
    const page = vi.spyOn(repo, "getWorksPage").mockResolvedValue({
      items: [],
      hasNext: false,
      total: 0,
    });
    await GET(new Request("https://test/api/books/page?limit=5000"));
    expect(page).toHaveBeenCalledWith({
      query: {
        q: undefined,
        category: undefined,
        period: undefined,
        sort: "title",
      },
      after: undefined,
      limit: 50,
    });
  });

  it("uses the default for non-numeric limits", async () => {
    const page = vi.spyOn(repo, "getWorksPage").mockResolvedValue({
      items: [],
      hasNext: false,
      total: 0,
    });
    await GET(new Request("https://test/api/books/page?limit=invalid"));
    expect(page).toHaveBeenCalledWith({
      query: {
        q: undefined,
        category: undefined,
        period: undefined,
        sort: "title",
      },
      after: undefined,
      limit: DEFAULT_BOOKS_PAGE_SIZE,
    });
  });

  it("forwards the canonical combined filter and sort model", async () => {
    const page = vi.spyOn(repo, "getWorksPage").mockResolvedValue({
      items: [],
      hasNext: false,
      total: 0,
    });
    await GET(
      new Request(
        "https://test/api/books/page?q=glass&category=fantasy&period=2000-2009&sort=publication",
      ),
    );
    expect(page).toHaveBeenCalledWith({
      query: {
        q: "glass",
        category: "fantasy",
        period: "2000-2009",
        sort: "publication",
      },
      after: undefined,
      limit: DEFAULT_BOOKS_PAGE_SIZE,
    });
  });
});
