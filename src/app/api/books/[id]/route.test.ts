import { NextRequest } from "next/server";
import { describe, expect, it } from "vitest";
import { GET } from "./route";

describe("GET /api/books/[id]", () => {
  it("returns a book for a valid id", async () => {
    const request = new NextRequest("http://localhost:3000/api/books/1");

    const response = await GET(request, { params: { id: "1" } });

    const data = await response.json();

    expect(data).toHaveProperty("id", "1");
  });

  it("book has a title property", async () => {
    const request = new NextRequest("http://localhost:3000/api/books/1");

    const response = await GET(request, { params: { id: "1" } });

    const data = await response.json();

    expect(data).toHaveProperty("title");
  });

  it("book has an author property", async () => {
    const request = new NextRequest("http://localhost:3000/api/books/1");

    const response = await GET(request, { params: { id: "1" } });

    const data = await response.json();

    expect(data).toHaveProperty("author");
  });

  it("returns 404 for missing id", async () => {
    const request = new NextRequest("http://localhost:3000/api/books/999");

    const response = await GET(request, { params: { id: "999" } });

    const data = await response.json();

    expect(response.status).toBe(404);
    expect(data).toHaveProperty("error", "Not found");
  });
});
