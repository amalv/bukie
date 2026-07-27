import { beforeEach, describe, expect, it, vi } from "vitest";
import * as repo from "@/features/books/repo";
import { workSummaryFixture } from "@/test/catalog-fixtures";
import { GET, OPTIONS } from "./route";

describe("GET /api/books", () => {
  beforeEach(() => vi.restoreAllMocks());

  it("returns normalized work summaries and forwards search", async () => {
    const list = vi
      .spyOn(repo, "getWorks")
      .mockResolvedValue([workSummaryFixture]);
    const response = await GET(new Request("https://test/api/books?q=author"));
    expect(response.status).toBe(200);
    expect(await response.json()).toEqual([workSummaryFixture]);
    expect(list).toHaveBeenCalledWith("author");
  });

  it("returns 500 when the repository fails", async () => {
    vi.spyOn(repo, "getWorks").mockRejectedValue(new Error("failed"));
    const response = await GET(new Request("https://test/api/books"));
    expect(response.status).toBe(500);
  });

  it("advertises read-only methods", async () => {
    const response = await OPTIONS();
    expect(response.headers.get("Access-Control-Allow-Methods")).toBe(
      "GET,OPTIONS",
    );
  });
});
