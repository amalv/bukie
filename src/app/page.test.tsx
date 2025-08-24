import { describe, expect, it, vi } from "vitest";
import "@testing-library/jest-dom";
import { render, screen } from "@testing-library/react";
import * as bl from "@/features/books/BookList.css";
import * as data from "@/features/books/data";
import * as repo from "@/features/books/repo";
import type { Book } from "@/features/books/types";
import Page from "./page";
import * as s from "./page.css";

type SearchParams = { [key: string]: string | string[] | undefined };

describe("Page", () => {
  it("renders BookList with books", async () => {
    vi.spyOn(data, "getBooksPage").mockResolvedValue({
      items: [{ id: "1", title: "A", author: "B", cover: "x" }],
      nextCursor: undefined,
      hasNext: false,
    });
    vi.spyOn(repo, "getNewArrivals").mockResolvedValue([
      { id: "1", title: "A", author: "B", cover: "x" },
    ]);
    const Comp = await Page({ searchParams: Promise.resolve({ q: "" }) });
    render(Comp);
    expect(screen.getByText("A")).toBeInTheDocument();
    expect(screen.getByText(/by\s*B/)).toBeInTheDocument();
  });

  it("renders error state when fetch fails", async () => {
    vi.spyOn(data, "getBooksPage").mockRejectedValue(new Error("fail"));
    const Comp = await Page({ searchParams: Promise.resolve({ q: "" }) });
    render(Comp);
    expect(screen.getByText(/failed to load books/i)).toBeInTheDocument();
  });

  it("renders section header and uses dense spacing for new arrivals", async () => {
    vi.spyOn(data, "getBooksPage").mockResolvedValue({
      items: [],
      nextCursor: undefined,
      hasNext: false,
    });
    vi.spyOn(repo, "getNewArrivals").mockResolvedValue([
      { id: "1", title: "A", author: "B", cover: "x" } as Book,
    ] as unknown as Book[]);
    const Comp = await Page({
      searchParams: Promise.resolve({ q: "", section: "new" }),
    });
    const { container } = render(Comp);
    expect(
      screen.getByRole("heading", { level: 2, name: /New Arrivals/i }),
    ).toBeInTheDocument();
    const svg = container.querySelector(`.${s.sectionHeaderIcon}`);
    expect(svg).toBeTruthy();
    const dense = container.querySelector(`.${bl.gridTopDense}`);
    expect(dense).toBeTruthy();
  });

  it("renders section header for top rated", async () => {
    vi.spyOn(data, "getBooksPage").mockResolvedValue({
      items: [],
      nextCursor: undefined,
      hasNext: false,
    });
    vi.spyOn(repo, "getTopRated").mockResolvedValue([
      { id: "2", title: "B", author: "C", cover: "y" },
    ]);
    const Comp = await Page({
      searchParams: Promise.resolve({ q: "", section: "top" }),
    });
    const { container } = render(Comp);
    expect(
      screen.getByRole("heading", { level: 2, name: /Top Rated/i }),
    ).toBeInTheDocument();
    const svg = container.querySelector(`.${s.sectionHeaderIcon}`);
    expect(svg).toBeTruthy();
    const dense = container.querySelector(`.${bl.gridTopDense}`);
    expect(dense).toBeTruthy();
  });

  it("renders section header for trending now", async () => {
    vi.spyOn(data, "getBooksPage").mockResolvedValue({
      items: [],
      nextCursor: undefined,
      hasNext: false,
    });
    vi.spyOn(repo, "getTrendingNow").mockResolvedValue([
      { id: "3", title: "C", author: "D", cover: "z" },
    ]);
    const Comp = await Page({
      searchParams: Promise.resolve({ q: "", section: "trending" }),
    });
    const { container } = render(Comp);
    expect(
      screen.getByRole("heading", { level: 2, name: /Trending Now/i }),
    ).toBeInTheDocument();
    const svg = container.querySelector(`.${s.sectionHeaderIcon}`);
    expect(svg).toBeTruthy();
    const dense = container.querySelector(`.${bl.gridTopDense}`);
    expect(dense).toBeTruthy();
  });

  it("renders fallback error UI if thrown", async () => {
    vi.spyOn(data, "getBooksPage").mockImplementation(() => {
      throw new Error("fail");
    });
    const Comp = await Page({ searchParams: Promise.resolve({ q: "" }) });
    render(Comp);
    expect(screen.getByText(/failed to load books/i)).toBeInTheDocument();
  });

  it("renders PaginatedBooks when q param is present", async () => {
    vi.spyOn(data, "getBooksPage").mockResolvedValue({
      items: [{ id: "99", title: "D", author: "E", cover: "c" }],
      nextCursor: "next-1",
      hasNext: true,
    });
    const Comp = await Page({ searchParams: Promise.resolve({ q: "dune" }) });
    const { container } = render(Comp);
    // search meta should be visible when q is provided
    expect(screen.getByText(/Showing results for "dune"/)).toBeInTheDocument();
    // PaginatedBooks branch renders a footer/button when nextCursor is present
    const btn =
      screen.queryByRole("button", { name: /Load More Books/i }) ||
      container.querySelector("button");
    expect(btn).toBeTruthy();
  });

  it("parses array params for section and after and calls repos appropriately", async () => {
    const spy = vi.spyOn(data, "getBooksPage").mockResolvedValue({
      items: [],
      nextCursor: undefined,
      hasNext: false,
    });
    const spyTop = vi
      .spyOn(repo, "getTopRated")
      .mockResolvedValue([{ id: "2", title: "B", author: "C", cover: "y" }]);

    const Comp = await Page({
      searchParams: Promise.resolve({
        q: [""],
        section: ["top"],
        after: ["cursor-1"],
      }),
    });
    render(Comp);

    // getBooksPage should have been called with the first element of the arrays
    expect(spy).toHaveBeenCalledWith({ q: "", after: "cursor-1", limit: 20 });
    expect(spyTop).toHaveBeenCalled();
  });

  it("handles empty-array params for q and after (nullish fallbacks)", async () => {
    const spy = vi.spyOn(data, "getBooksPage").mockResolvedValue({
      items: [],
      nextCursor: undefined,
      hasNext: false,
    });

    const Comp = await Page({
      searchParams: Promise.resolve({ q: [], after: [] }),
    });
    render(Comp);

    // when q is an empty array and after is an empty array, fallbacks should be used
    expect(spy).toHaveBeenCalledWith({ q: "", after: undefined, limit: 20 });
  });

  it("accepts q as an array with a value and uses the first element", async () => {
    const spy = vi.spyOn(data, "getBooksPage").mockResolvedValue({
      items: [{ id: "7", title: "Z", author: "Y", cover: "z" }],
      nextCursor: undefined,
      hasNext: false,
    });

    const Comp = await Page({
      searchParams: Promise.resolve({ q: ["array-q"] }),
    });
    render(Comp);

    expect(spy).toHaveBeenCalledWith({
      q: "array-q",
      after: undefined,
      limit: 20,
    });
    expect(
      screen.getByText(/Showing results for "array-q"/),
    ).toBeInTheDocument();
  });

  it("handles q as [undefined] and falls back to empty string", async () => {
    const spy = vi.spyOn(data, "getBooksPage").mockResolvedValue({
      items: [],
      nextCursor: undefined,
      hasNext: false,
    });

    // Test simulates runtime shape with undefined in array; cast through unknown to satisfy TS
    const Comp = await Page({
      searchParams: Promise.resolve({
        q: [undefined],
      }) as unknown as Promise<SearchParams>,
    });
    render(Comp);

    expect(spy).toHaveBeenCalledWith({ q: "", after: undefined, limit: 20 });
  });

  it("handles q explicitly set to null (runtime) and falls back to empty string", async () => {
    const spy = vi.spyOn(data, "getBooksPage").mockResolvedValue({
      items: [],
      nextCursor: undefined,
      hasNext: false,
    });

    // Test simulates runtime null q value; cast through unknown to satisfy lint
    const Comp = await Page({
      searchParams: Promise.resolve({
        q: null as unknown as string,
      }) as unknown as Promise<SearchParams>,
    });
    render(Comp);

    expect(spy).toHaveBeenCalledWith({ q: "", after: undefined, limit: 20 });
  });

  it("handles missing q property and falls back to empty string", async () => {
    const spy = vi.spyOn(data, "getBooksPage").mockResolvedValue({
      items: [],
      nextCursor: undefined,
      hasNext: false,
    });

    const Comp = await Page({
      searchParams: Promise.resolve({}) as Promise<SearchParams>,
    });
    render(Comp);

    expect(spy).toHaveBeenCalledWith({ q: "", after: undefined, limit: 20 });
  });

  it("renders no section header or list when repo returns undefined sectionItems", async () => {
    vi.spyOn(data, "getBooksPage").mockResolvedValue({
      items: [],
      nextCursor: undefined,
      hasNext: false,
    });
    // simulate repo returning null (no items)
    vi.spyOn(repo, "getNewArrivals").mockResolvedValue(
      null as unknown as Book[],
    );

    const Comp = await Page({ searchParams: Promise.resolve({ q: "" }) });
    const { container } = render(Comp);

    // when sectionItems is falsy, the section header and BookList should not render
    expect(container.querySelector(`.${s.sectionHeader}`)).toBeNull();
    expect(container.querySelector(`.${s.sectionTitle}`)).toBeNull();
    const bookList = container.querySelector("[data-testid='book-list']");
    // BookList renders as normal markup; ensure no list present for sectionItems
    expect(bookList).toBeNull();
  });
});
