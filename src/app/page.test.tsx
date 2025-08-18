import { describe, expect, it, vi } from "vitest";
import "@testing-library/jest-dom";
import { render, screen } from "@testing-library/react";
import * as data from "@/features/books/data";
import Page from "./page";

describe("Page", () => {
  it("renders BookList with books", async () => {
    vi.spyOn(data, "getBooks").mockResolvedValue([
      { id: "1", title: "A", author: "B", cover: "x" },
    ]);
    const Comp = await Page({ searchParams: { q: "" } });
    render(Comp);
    expect(screen.getByText("A")).toBeInTheDocument();
    expect(screen.getByText(/by\s*B/)).toBeInTheDocument();
  });

  it("renders error state when fetch fails", async () => {
    vi.spyOn(data, "getBooks").mockRejectedValue(new Error("fail"));
    const Comp = await Page({ searchParams: { q: "" } });
    render(Comp);
    expect(screen.getByText(/failed to load books/i)).toBeInTheDocument();
  });
});
