import { beforeEach, describe, expect, it, vi } from "vitest";
import * as data from "@/features/books/data";
import { GET } from "./route";

describe("GET /api/books/page", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns books page for valid request", async () => {
    const mockPage = {
      items: [
        { id: "1", title: "Book 1", author: "Author", cover: "cover.png" },
      ],
      hasNext: false,
      next: null,
    };
    const spy = vi.spyOn(data, "getBooksPage").mockResolvedValue(mockPage);
    const url = "https://test/api/books/page?q=test&after=123&limit=10";
    const req = { url } as Request;
    const res = await GET(req);
    const json = await res.json();

    expect(spy).toHaveBeenCalledWith({ q: "test", after: "123", limit: 10 });
    expect(json).toHaveProperty("items");
    expect(json.items[0]).toHaveProperty("id", "1");
    spy.mockRestore();
  });

  it("uses default limit when not provided", async () => {
    const mockPage = { items: [], hasNext: false, next: null };
    const spy = vi.spyOn(data, "getBooksPage").mockResolvedValue(mockPage);
    const url = "https://test/api/books/page";
    const req = { url } as Request;
    const res = await GET(req);
    const _json = await res.json();
    expect(spy).toHaveBeenCalledWith({
      q: undefined,
      after: undefined,
      limit: 20,
    });
    spy.mockRestore();
  });

  it("handles errors and returns 500", async () => {
    const spy = vi
      .spyOn(data, "getBooksPage")
      .mockRejectedValue(new Error("fail"));
    const errorSpy = vi.spyOn(console, "error").mockImplementation(() => {});
    const url = "https://test/api/books/page";
    const req = { url } as Request;
    const res = await GET(req);
    const json = await res.json();

    expect(res).toHaveProperty("status", 500);
    expect(json).toHaveProperty("error");
    expect(json.error).toMatch(/internal server error/i);
    spy.mockRestore();
    errorSpy.mockRestore();
  });
});
