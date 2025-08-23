import { NextRequest } from "next/server";
import { describe, expect, it, vi } from "vitest";
import * as data from "@/features/books/data";
import { GET, POST } from "./route";

describe("GET /api/books", () => {
  it("returns an array of books", async () => {
    const response = await GET();

    const data = await response.json();

    expect(Array.isArray(data)).toBe(true);
    expect(data.length).toBeGreaterThan(0);
  });

  it("first book has an id property", async () => {
    const response = await GET();

    const data = await response.json();

    expect(data[0]).toHaveProperty("id");
  });

  it("first book has a title property", async () => {
    const response = await GET();

    const data = await response.json();

    expect(data[0]).toHaveProperty("title");
  });

  it("first book has an author property", async () => {
    const response = await GET();

    const data = await response.json();

    expect(data[0]).toHaveProperty("author");
  });

  it("returns 500 when getBooks throws", async () => {
    const spy = vi.spyOn(data, "getBooks").mockRejectedValue(new Error("boom"));
    const errorSpy = vi.spyOn(console, "error").mockImplementation(() => {});
    const res = await GET();
    expect(res.status).toBe(500);
    const json = (await res.json()) as { error: string };
    expect(json.error).toMatch(/internal server error/i);
    spy.mockRestore();
    errorSpy.mockRestore();
  });

  it("POST returns 400 when required fields are missing", async () => {
    const req = new NextRequest("http://localhost:3000/api/books", {
      method: "POST",
      body: JSON.stringify({}),
    });
    const res = await POST(req);
    expect(res.status).toBe(400);
    const json = (await res.json()) as { error: string };
    expect(json.error).toMatch(/invalid payload/i);
  });

  it("creates a book via POST (201)", async () => {
    const payload = {
      title: "New Book",
      author: "Anon",
      cover: "https://example.com/x.png",
    };
    const req = new NextRequest("http://localhost:3000/api/books", {
      method: "POST",
      body: JSON.stringify(payload),
    });
    const res = await POST(req);
    expect(res.status).toBe(201);
    const data = (await res.json()) as { id: string; title: string };
    expect(data).toHaveProperty("id");
    expect(data).toHaveProperty("title", payload.title);
  });
});
