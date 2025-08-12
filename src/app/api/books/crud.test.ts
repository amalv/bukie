import { NextRequest } from "next/server";
import { describe, expect, it } from "vitest";
import { DELETE, PUT } from "./[id]/route";
import { POST } from "./route";

describe("CRUD /api/books", () => {
  it("creates a book via POST", async () => {
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
    const data = (await res.json()) as {
      id: string;
      title: string;
      author: string;
      cover: string;
    };
    expect(data).toHaveProperty("id");
    expect(data).toHaveProperty("title", payload.title);
  });

  it("updates a book via PUT", async () => {
    // Arrange: create a book first
    const createPayload = {
      title: "Temp",
      author: "Temp",
      cover: "https://example.com/temp.png",
    };
    const createReq = new NextRequest("http://localhost:3000/api/books", {
      method: "POST",
      body: JSON.stringify(createPayload),
    });
    const createRes = await POST(createReq);
    const created = (await createRes.json()) as { id: string };

    const payload = { title: "Updated Title" };
    const req = new NextRequest(
      `http://localhost:3000/api/books/${created.id}`,
      {
        method: "PUT",
        body: JSON.stringify(payload),
      },
    );

    const res = await PUT(req, { params: Promise.resolve({ id: created.id }) });

    expect(res.status).toBe(200);
    const data = (await res.json()) as {
      id: string;
      title: string;
      author: string;
      cover: string;
    };
    expect(data).toHaveProperty("title", "Updated Title");
  });

  it("deletes a book via DELETE", async () => {
    // Arrange: create a book first
    const createPayload = {
      title: "TempD",
      author: "TempD",
      cover: "https://example.com/tempd.png",
    };
    const createReq = new NextRequest("http://localhost:3000/api/books", {
      method: "POST",
      body: JSON.stringify(createPayload),
    });
    const createRes = await POST(createReq);
    const created = (await createRes.json()) as { id: string };

    const req = new NextRequest(
      `http://localhost:3000/api/books/${created.id}`,
      {
        method: "DELETE",
      },
    );

    const res = await DELETE(req, {
      params: Promise.resolve({ id: created.id }),
    });

    expect(res.status).toBe(204);
  });
});
