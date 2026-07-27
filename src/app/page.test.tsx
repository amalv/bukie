import "@testing-library/jest-dom";
import { render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import * as repo from "@/features/books/repo";
import { workSummaryFixture } from "@/test/catalog-fixtures";
import Page from "./page";

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: vi.fn() }),
}));

describe("homepage", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    vi.spyOn(repo, "getWorksPage").mockResolvedValue({
      items: [workSummaryFixture],
      hasNext: false,
      total: 1,
    });
    vi.spyOn(repo, "getNewArrivals").mockResolvedValue([workSummaryFixture]);
    vi.spyOn(repo, "getCatalogCategories").mockResolvedValue([
      { slug: "fiction", label: "Fiction" },
    ]);
  });

  it("renders the honest supported catalog sections", async () => {
    render(await Page({ searchParams: Promise.resolve({}) }));
    expect(screen.getByRole("link", { name: "All" })).toBeInTheDocument();
    expect(
      screen.getByRole("link", { name: /New Arrivals/ }),
    ).toBeInTheDocument();
    expect(
      screen.queryByText(/Top Rated|Trending Now/),
    ).not.toBeInTheDocument();
  });

  it("renders normalized new arrivals", async () => {
    render(
      await Page({
        searchParams: Promise.resolve({ section: "new" }),
      }),
    );
    expect(
      screen.getByRole("heading", { level: 2, name: "New Arrivals" }),
    ).toBeInTheDocument();
    expect(screen.getByText(workSummaryFixture.title)).toBeInTheDocument();
  });

  it("renders search results and forwards the query", async () => {
    const page = vi.spyOn(repo, "getWorksPage");
    render(await Page({ searchParams: Promise.resolve({ q: "example" }) }));
    expect(
      screen.getByText(/Active filters: Search: “example”/),
    ).toBeInTheDocument();
    expect(page).toHaveBeenCalledWith({
      query: {
        q: "example",
        category: undefined,
        period: undefined,
        sort: "title",
      },
      after: undefined,
      limit: 24,
    });
  });

  it("renders canonical active-filter context and zero-result recovery", async () => {
    vi.spyOn(repo, "getWorksPage").mockResolvedValue({
      items: [],
      hasNext: false,
      total: 0,
    });
    render(
      await Page({
        searchParams: Promise.resolve({
          category: "fiction",
          period: "2000-2009",
          sort: "publication",
        }),
      }),
    );
    expect(
      screen.getByText(/Active filters: Category: Fiction/),
    ).toHaveTextContent("Published: 2000–2009");
    expect(
      screen.getByRole("link", { name: "Reset all filters" }),
    ).toHaveAttribute("href", "/");
  });

  it("renders an error state when catalog reads fail", async () => {
    vi.spyOn(repo, "getWorksPage").mockRejectedValue(new Error("failed"));
    render(await Page({ searchParams: Promise.resolve({}) }));
    expect(screen.getByRole("alert")).toHaveTextContent("Failed to load books");
  });
});
