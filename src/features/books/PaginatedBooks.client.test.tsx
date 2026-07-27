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
        json: async () => ({ items: [second], hasNext: false }),
      }),
    );
    render(
      <PaginatedBooks
        initial={[workSummaryFixture]}
        initialNextCursor="cursor"
        title="All Books"
      />,
    );
    fireEvent.click(screen.getByRole("button", { name: /load more books/i }));
    await waitFor(() =>
      expect(screen.getByText("Second Work")).toBeInTheDocument(),
    );
    expect(screen.getByText("2 books shown")).toBeInTheDocument();
  });

  it("shows a recoverable error when pagination fails", async () => {
    vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new Error("failed")));
    render(
      <PaginatedBooks
        initial={[workSummaryFixture]}
        initialNextCursor="cursor"
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
