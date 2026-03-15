import { NextRequest } from "next/server";
import { afterEach, describe, expect, it, vi } from "vitest";
import * as repo from "@/features/books/repo";
import { POST } from "../route";
import { DELETE, GET, PUT } from "./route";

const fixtureBook = {
  id: "fixture-book-id",
  title: "Fixture Book",
  author: "Fixture Author",
  cover: "/covers/placeholder.svg",
};

afterEach(() => {
  vi.restoreAllMocks();
});

describe("GET /api/books/[id]", () => {
  it("returns a book for a valid id", async () => {
    vi.spyOn(repo, "findBookById").mockResolvedValue(fixtureBook);
    const request = new NextRequest(
      `http://localhost:3000/api/books/${fixtureBook.id}`,
    );

    const response = await GET(request, {
      params: Promise.resolve({ id: fixtureBook.id }),
    });

    const data = await response.json();

    expect(data).toHaveProperty("id", fixtureBook.id);
  });

  it("book has a title property", async () => {
    vi.spyOn(repo, "findBookById").mockResolvedValue(fixtureBook);
    const request = new NextRequest(
      `http://localhost:3000/api/books/${fixtureBook.id}`,
    );

    const response = await GET(request, {
      params: Promise.resolve({ id: fixtureBook.id }),
    });

    const data = await response.json();

    expect(data).toHaveProperty("title");
  });

  it("book has an author property", async () => {
    vi.spyOn(repo, "findBookById").mockResolvedValue(fixtureBook);
    const request = new NextRequest(
      `http://localhost:3000/api/books/${fixtureBook.id}`,
    );

    const response = await GET(request, {
      params: Promise.resolve({ id: fixtureBook.id }),
    });

    const data = await response.json();

    expect(data).toHaveProperty("author");
  });

  it("returns 404 for missing id", async () => {
    const request = new NextRequest("http://localhost:3000/api/books/999");

    const response = await GET(request, {
      params: Promise.resolve({ id: "999" }),
    });

    const data = await response.json();

    expect(response.status).toBe(404);
    expect(data).toHaveProperty("error", "Not found");
  });

  it("PUT returns 404 when book does not exist", async () => {
    const req = new NextRequest(
      "http://localhost:3000/api/books/does-not-exist",
      {
        method: "PUT",
        body: JSON.stringify({ title: "X" }),
      },
    );
    const res = await PUT(req, {
      params: Promise.resolve({ id: "does-not-exist" }),
    });
    expect(res.status).toBe(404);
  });

  it("DELETE returns 404 when book does not exist", async () => {
    const req = new NextRequest(
      "http://localhost:3000/api/books/does-not-exist",
      { method: "DELETE" },
    );
    const res = await DELETE(req, {
      params: Promise.resolve({ id: "does-not-exist" }),
    });
    expect(res.status).toBe(404);
  });

  it("updates and deletes an existing book via PUT/DELETE", async () => {
    // create a book first
    const createReq = new NextRequest("http://localhost:3000/api/books", {
      method: "POST",
      body: JSON.stringify({
        title: "Temp",
        author: "Temp",
        cover: "https://example.com/temp.png",
      }),
    });
    const createRes = await POST(createReq);
    const created = (await createRes.json()) as { id: string };

    // update
    const putReq = new NextRequest(
      `http://localhost:3000/api/books/${created.id}`,
      {
        method: "PUT",
        body: JSON.stringify({ title: "Updated" }),
      },
    );
    const putRes = await PUT(putReq, {
      params: Promise.resolve({ id: created.id }),
    });
    expect(putRes.status).toBe(200);

    // delete
    const delReq = new NextRequest(
      `http://localhost:3000/api/books/${created.id}`,
      { method: "DELETE" },
    );
    const delRes = await DELETE(delReq, {
      params: Promise.resolve({ id: created.id }),
    });
    expect(delRes.status).toBe(204);
  });
});
