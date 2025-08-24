import { act, fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { PaginatedBooks } from "./PaginatedBooks.client";

vi.stubGlobal(
  "fetch",
  vi.fn(() =>
    Promise.resolve({
      ok: true,
      json: () =>
        Promise.resolve({
          items: [
            {
              id: "4",
              title: "D",
              author: "Test Author",
              cover: "/covers/placeholder.webp",
              rating: 0,
              description: "",
            },
          ],
          nextCursor: undefined,
        }),
    }),
  ) as unknown as typeof fetch,
);

describe("PaginatedBooks client", () => {
  it("renders initial items and loads more", async () => {
    render(
      <PaginatedBooks
        initial={[
          {
            id: "1",
            title: "A",
            author: "Test Author",
            cover: "/covers/placeholder.webp",
            rating: 0,
            description: "",
          },
        ]}
        initialNextCursor={"cursor"}
        q={undefined}
      />,
    );
    expect(screen.getByText("A")).toBeTruthy();
    const btn = await screen.findByRole("button");
    await act(async () => {
      fireEvent.click(btn);
    });
    // Wait for fetch to resolve and new item to render
    const newItem = await screen.findByText("D");
    expect(newItem).toBeTruthy();
  });

  it("shows error when loadMore fails", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(() =>
        Promise.resolve({
          ok: false,
          status: 500,
          json: () => Promise.resolve({}),
        }),
      ),
    );
    render(
      <PaginatedBooks
        initial={[
          {
            id: "1",
            title: "A",
            author: "",
            cover: "/covers/placeholder.webp",
            rating: 0,
            description: "",
          },
        ]}
        initialNextCursor={"cursor"}
      />,
    );
    const btn = await screen.findByRole("button");
    await act(async () => {
      fireEvent.click(btn);
    });
    // Find all alert nodes and check for error text in any
    const alertNodes = await screen.findAllByRole("alert");
    const found = alertNodes.some((node) =>
      node.textContent?.toLowerCase().includes("failed to load more books"),
    );
    expect(found).toBe(true);
  });

  it("does not show load more button when no nextCursor", () => {
    render(
      <PaginatedBooks
        initial={[
          {
            id: "1",
            title: "A",
            author: "",
            cover: "/covers/placeholder.webp",
            rating: 0,
            description: "",
          },
        ]}
        initialNextCursor={undefined}
      />,
    );
    expect(screen.queryByRole("button")).toBeNull();
  });

  it("prevents duplicate fetch when loading is true", async () => {
    // Create a fetch mock we can resolve later to keep component loading
    let resolveFetch: ((value?: unknown) => void) | undefined;
    const fetchMock = vi.fn(
      () =>
        new Promise((res) => {
          resolveFetch = res;
        }),
    );

    vi.stubGlobal("fetch", fetchMock as unknown as typeof fetch);

    render(
      <PaginatedBooks
        initial={[
          {
            id: "1",
            title: "A",
            author: "Test Author",
            cover: "/covers/placeholder.webp",
            rating: 0,
            description: "",
          },
        ]}
        initialNextCursor={"cursor"}
      />,
    );

    const btn = await screen.findByRole("button");

    // First click starts loading and triggers the fetch
    await act(async () => {
      fireEvent.click(btn);
    });

    // Second click while still loading should early-return and not call fetch again
    await act(async () => {
      fireEvent.click(btn);
    });

    expect(fetchMock).toHaveBeenCalledTimes(1);

    // Now resolve the fetch to let the component finish
    await act(async () => {
      resolveFetch?.({
        ok: true,
        json: () => Promise.resolve({ items: [], nextCursor: undefined }),
      });
      // allow microtask queue to drain
      await Promise.resolve();
    });
  });
});
