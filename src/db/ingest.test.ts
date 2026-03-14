import { describe, expect, it, vi } from "vitest";
import { ingestBooks } from "./ingest";

describe("ingestBooks", () => {
  it("handles a 3-book smoke import in upsert mode", async () => {
    const listBooks = vi.fn().mockResolvedValue([
      {
        id: "existing-book",
        title: "Dune",
        author: "Frank Herbert",
        cover: "/covers/dune.webp",
      },
    ]);
    const getBook = vi
      .fn()
      .mockResolvedValueOnce({
        id: "existing-book",
        title: "Dune",
        author: "Frank Herbert",
        cover: "/covers/dune.webp",
      })
      .mockResolvedValueOnce(undefined)
      .mockResolvedValueOnce(undefined);
    const updateBookRow = vi.fn().mockResolvedValue({
      id: "existing-book",
      title: "Dune",
      author: "Frank Herbert",
      cover: "/covers/dune.webp",
    });
    const createBookRow = vi
      .fn()
      .mockImplementation(async (input: { id?: string; title: string }) => ({
        id: input.id ?? `${input.title}-generated`,
        ...input,
      }));

    const report = await ingestBooks(
      [
        {
          id: "existing-book",
          title: "Dune",
          author: "Frank Herbert",
          cover: "/covers/dune.webp",
        },
        {
          title: "Hyperion",
          author: "Dan Simmons",
          cover: "/covers/hyperion.webp",
        },
        {
          title: "Kindred",
          author: "Octavia E. Butler",
          cover: "/covers/kindred.webp",
        },
      ],
      {
        mode: "upsert",
        prov: {
          listBooks,
          listNewArrivals: vi.fn(),
          listTopRated: vi.fn(),
          listTrendingNow: vi.fn(),
          searchBooks: vi.fn(),
          listBooksPage: vi.fn(),
          searchBooksPage: vi.fn(),
          getBook,
          createBookRow,
          updateBookRow,
          deleteBookRow: vi.fn(),
          deleteBooksByGenre: vi.fn(),
        },
      },
    );

    expect(report.processed).toBe(3);
    expect(report.updated).toBe(1);
    expect(report.created).toBe(2);
    expect(report.failed).toBe(0);
    expect(updateBookRow).toHaveBeenCalledTimes(1);
    expect(createBookRow).toHaveBeenCalledTimes(2);
  });

  it("supports dry-run without mutating the provider", async () => {
    const createBookRow = vi.fn();
    const updateBookRow = vi.fn();

    const report = await ingestBooks(
      [
        {
          id: "book-1",
          title: "Dune",
          author: "Frank Herbert",
          cover: "/covers/dune.webp",
        },
      ],
      {
        mode: "upsert",
        dryRun: true,
        prov: {
          listBooks: vi.fn().mockResolvedValue([]),
          listNewArrivals: vi.fn(),
          listTopRated: vi.fn(),
          listTrendingNow: vi.fn(),
          searchBooks: vi.fn(),
          listBooksPage: vi.fn(),
          searchBooksPage: vi.fn(),
          getBook: vi.fn(),
          createBookRow,
          updateBookRow,
          deleteBookRow: vi.fn(),
          deleteBooksByGenre: vi.fn(),
        },
      },
    );

    expect(report.created).toBe(0);
    expect(report.updated).toBe(0);
    expect(report.failed).toBe(0);
    expect(report.results).toEqual([
      { id: "book-1", title: "Dune", status: "dry-run" },
    ]);
    expect(createBookRow).not.toHaveBeenCalled();
    expect(updateBookRow).not.toHaveBeenCalled();
  });
});
