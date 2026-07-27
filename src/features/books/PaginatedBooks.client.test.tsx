import "@testing-library/jest-dom";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { workSummaryFixture } from "@/test/catalog-fixtures";
import { PaginatedBooks } from "./PaginatedBooks.client";

describe("PaginatedBooks", () => {
  afterEach(() => vi.restoreAllMocks());

  it("appends normalized work summaries from the page API", async () => {
    const second = {
      ...workSummaryFixture,
      id: "work-2",
      title: "Second Work",
    };
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({ items: [second], hasNext: false, total: 2 }),
      }),
    );
    render(
      <PaginatedBooks
        initial={[workSummaryFixture]}
        initialNextCursor="cursor"
        query={{ sort: "title" }}
        total={2}
        title="All Books"
      />,
    );
    fireEvent.click(screen.getByRole("button", { name: /load more books/i }));
    await waitFor(() =>
      expect(screen.getByText("Second Work")).toBeInTheDocument(),
    );
    expect(fetch).toHaveBeenCalledWith(
      "/api/books/page?after=cursor&limit=24",
      { cache: "no-store" },
    );
    expect(screen.getByText("2 of 2 books shown")).toBeInTheDocument();
  });

  it("preserves canonical filters and sort in load-more requests", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({ items: [], hasNext: false, total: 25 }),
      }),
    );
    render(
      <PaginatedBooks
        initial={[workSummaryFixture]}
        initialNextCursor="cursor"
        query={{
          q: "the",
          category: "science-fiction",
          period: "1950-1999",
          sort: "publication",
        }}
        total={25}
      />,
    );
    fireEvent.click(screen.getByRole("button", { name: /load more books/i }));
    await waitFor(() =>
      expect(fetch).toHaveBeenCalledWith(
        "/api/books/page?q=the&category=science-fiction&period=1950-1999&sort=publication&after=cursor&limit=24",
        { cache: "no-store" },
      ),
    );
  });

  it("shows a recoverable error when pagination fails", async () => {
    vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new Error("failed")));
    render(
      <PaginatedBooks
        initial={[workSummaryFixture]}
        initialNextCursor="cursor"
        query={{ sort: "title" }}
        total={2}
      />,
    );
    fireEvent.click(screen.getByRole("button", { name: /load more books/i }));
    await waitFor(() =>
      expect(screen.getByRole("alert")).toHaveTextContent(
        "Failed to load more books",
      ),
    );
  });
});
