import { beforeEach, describe, expect, it, vi } from "vitest";
import * as repo from "@/features/books/repo";
import { workDetailFixture } from "@/test/catalog-fixtures";
import { GET, OPTIONS } from "./route";

describe("GET /api/books/[id]", () => {
  beforeEach(() => vi.restoreAllMocks());

  it("returns normalized work detail by work ID", async () => {
    const find = vi
      .spyOn(repo, "findWorkById")
      .mockResolvedValue(workDetailFixture);
    const response = await GET(new Request("https://test"), {
      params: Promise.resolve({ id: workDetailFixture.id }),
    });
    expect(await response.json()).toEqual(workDetailFixture);
    expect(find).toHaveBeenCalledWith(workDetailFixture.id);
  });

  it("returns 404 for an unknown work ID", async () => {
    vi.spyOn(repo, "findWorkById").mockResolvedValue(undefined);
    const response = await GET(new Request("https://test"), {
      params: Promise.resolve({ id: "missing" }),
    });
    expect(response.status).toBe(404);
  });

  it("advertises read-only methods", async () => {
    const response = await OPTIONS();
    expect(response.headers.get("Access-Control-Allow-Methods")).toBe(
      "GET,OPTIONS",
    );
  });
});
