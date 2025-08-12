import { describe, expect, it } from "vitest";
import { GET } from "./route";

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
});
