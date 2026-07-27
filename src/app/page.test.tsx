import "@testing-library/jest-dom";
import { render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import * as repo from "@/features/books/repo";
import { workSummaryFixture } from "@/test/catalog-fixtures";
import Page from "./page";

describe("homepage", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    vi.spyOn(repo, "getWorksPage").mockResolvedValue({
      items: [workSummaryFixture],
      hasNext: false,
    });
    vi.spyOn(repo, "getNewArrivals").mockResolvedValue([workSummaryFixture]);
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
      screen.getByText(/Showing results for "example"/),
    ).toBeInTheDocument();
    expect(page).toHaveBeenCalledWith({
      q: "example",
      after: undefined,
      limit: 24,
    });
  });

  it("renders an error state when catalog reads fail", async () => {
    vi.spyOn(repo, "getWorksPage").mockRejectedValue(new Error("failed"));
    render(await Page({ searchParams: Promise.resolve({}) }));
    expect(screen.getByRole("alert")).toHaveTextContent("Failed to load books");
  });
});
