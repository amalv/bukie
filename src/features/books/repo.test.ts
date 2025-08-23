import { describe, expect, it, vi } from "vitest";
import * as repo from "./repo";

vi.mock("@/db/client", () => ({ ensureDb: vi.fn() }));
vi.mock("@/db/provider", () => ({
  createBookRow: vi.fn(async (input) => ({ ...input, id: "new-id" })),
  deleteBookRow: vi.fn(async () => true),
  getBook: vi.fn(async (id) => ({ id, title: "Mock Book" })),
  listNewArrivals: vi.fn(async () => [{ id: "1", title: "A" }]),
  listTopRated: vi.fn(async () => [{ id: "2", title: "B" }]),
  listTrendingNow: vi.fn(async () => [{ id: "3", title: "C" }]),
  updateBookRow: vi.fn(async (id, patch) => ({ id, ...patch })),
}));

describe("repo functions", () => {
  it("findBookById returns book", async () => {
    const book = await repo.findBookById("1");
    expect(book).toEqual({ id: "1", title: "Mock Book" });
  });

  it("createBook returns new book", async () => {
    const book = await repo.createBook({
      title: "New",
      author: "Author",
      cover: "cover.jpg",
      description: "desc",
      pages: 123,
      publisher: "Pub",
      isbn: "1234567890",
      rating: 0,
      ratingsCount: 0,
      addedAt: 1692748800000,
    });
    expect(book.id).toBe("new-id");
    expect(book.title).toBe("New");
  });

  it("updateBook returns updated book", async () => {
    const book = await repo.updateBook("1", { title: "Updated" });
    expect(book).toEqual({ id: "1", title: "Updated" });
  });

  it("deleteBook returns true", async () => {
    const result = await repo.deleteBook("1");
    expect(result).toBe(true);
  });

  it("getNewArrivals returns books", async () => {
    const books = await repo.getNewArrivals();
    expect(books[0].title).toBe("A");
  });

  it("getTopRated returns books", async () => {
    const books = await repo.getTopRated();
    expect(books[0].title).toBe("B");
  });

  it("getTrendingNow returns books", async () => {
    const books = await repo.getTrendingNow();
    expect(books[0].title).toBe("C");
  });
});
