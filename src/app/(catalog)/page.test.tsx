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

  it("renders explainable server-side discovery sections", async () => {
    render(await Page({ searchParams: Promise.resolve({}) }));
    expect(
      screen.getByRole("heading", { level: 2, name: "Browse by Category" }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("heading", { level: 2, name: "New Arrivals" }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("heading", { level: 2, name: "All Books" }),
    ).toBeInTheDocument();
    expect(
      screen.getByText(/not publication recency or popularity/),
    ).toBeVisible();
    expect(screen.getByRole("link", { name: "Fiction books" })).toHaveAttribute(
      "href",
      "/?category=fiction",
    );
    expect(
      screen.queryByText(/Top Rated|Trending Now/),
    ).not.toBeInTheDocument();
  });

  it("renders normalized new arrivals with canonical continuation", async () => {
    render(await Page({ searchParams: Promise.resolve({}) }));
    expect(
      screen.getByRole("heading", { level: 2, name: "New Arrivals" }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("link", { name: "View all new arrivals" }),
    ).toHaveAttribute("href", "/?sort=added");
    expect(screen.getAllByText(workSummaryFixture.title)).toHaveLength(2);
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
    expect(screen.getByRole("alert")).toHaveTextContent(
      "complete catalog is temporarily unavailable",
    );
    expect(
      screen.getByRole("heading", { name: "New Arrivals" }),
    ).toBeInTheDocument();
  });

  it("keeps useful sections when category data is partial", async () => {
    vi.spyOn(repo, "getCatalogCategories").mockRejectedValue(
      new Error("failed"),
    );
    render(await Page({ searchParams: Promise.resolve({}) }));
    expect(screen.getAllByRole("alert")[0]).toHaveTextContent(
      "Categories are temporarily unavailable",
    );
    expect(screen.getAllByText(workSummaryFixture.title)).toHaveLength(2);
    expect(
      screen.getByRole("heading", { name: "All Books" }),
    ).toBeInTheDocument();
  });

  it("uses the canonical added sort as the full New Arrivals surface", async () => {
    render(
      await Page({
        searchParams: Promise.resolve({ sort: "added" }),
      }),
    );
    expect(
      screen.getByRole("heading", { level: 2, name: "New Arrivals" }),
    ).toBeInTheDocument();
    expect(screen.queryByText("Browse by Category")).not.toBeInTheDocument();
    expect(screen.getByText(/Preferred-edition catalog dates/)).toBeVisible();
  });
});
