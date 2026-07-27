import "@testing-library/jest-dom";
import { render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import * as repo from "@/features/books/repo";
import { workDetailFixture } from "@/test/catalog-fixtures";
import BookPage, { generateMetadata } from "./page";

vi.mock("next/navigation", () => ({
  notFound: vi.fn(() => {
    throw new Error("NEXT_NOT_FOUND");
  }),
}));

describe("work detail page", () => {
  beforeEach(() => vi.restoreAllMocks());

  it("loads canonical detail by work ID", async () => {
    const find = vi
      .spyOn(repo, "findWorkById")
      .mockResolvedValue(workDetailFixture);
    render(
      await BookPage({
        params: Promise.resolve({ id: workDetailFixture.id }),
      }),
    );
    expect(
      screen.getByRole("heading", { level: 1, name: workDetailFixture.title }),
    ).toBeInTheDocument();
    expect(find).toHaveBeenCalledWith(workDetailFixture.id);
  });

  it("builds metadata only from normalized stored facts", async () => {
    vi.spyOn(repo, "findWorkById").mockResolvedValue(workDetailFixture);
    const metadata = await generateMetadata({
      params: Promise.resolve({ id: workDetailFixture.id }),
    });
    expect(metadata.title).toContain("Example Work");
    expect(metadata.description).toBe(workDetailFixture.description);
  });
});
