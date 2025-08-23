import { describe, expect, it, vi } from "vitest";
import "@testing-library/jest-dom";
import { render, screen } from "@testing-library/react";
import * as bl from "@/features/books/BookList.css";
import * as data from "@/features/books/data";
import * as repo from "@/features/books/repo";
import type { Book } from "@/features/books/types";
import Page from "./page";
import * as s from "./page.css";

describe("Page", () => {
  it("renders BookList with books", async () => {
    vi.spyOn(data, "getBooksPage").mockResolvedValue({
      items: [{ id: "1", title: "A", author: "B", cover: "x" }],
      nextCursor: undefined,
      hasNext: false,
    });
    vi.spyOn(repo, "getNewArrivals").mockResolvedValue([
      { id: "1", title: "A", author: "B", cover: "x" } as Book,
    ] as unknown as Book[]);
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
      { id: "2", title: "B", author: "C", cover: "y" } as Book,
    ] as unknown as Book[]);
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
      { id: "3", title: "C", author: "D", cover: "z" } as Book,
    ] as unknown as Book[]);
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
});
