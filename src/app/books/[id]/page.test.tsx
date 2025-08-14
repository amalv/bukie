import "@testing-library/jest-dom";
import { render, screen } from "@testing-library/react";
import type { Metadata } from "next";
import React from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import * as repo from "@/features/books/repo";
import type { Book } from "@/features/books/types";
import Page, { generateMetadata } from "./page";

const book: Book = {
  id: "99",
  title: "Ninety-Nine",
  author: "Anon",
  cover: "/c.jpg",
};

// The page module uses async params with Promise<{id:string}>; emulate that.
const params = (id: string) => Promise.resolve({ id });

describe("Book dynamic page", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it("generateMetadata returns not found title when absent", async () => {
    vi.spyOn(repo, "findBookById").mockResolvedValue(undefined);

    const meta = (await generateMetadata({
      params: params("nope"),
    })) as Metadata;
    expect(meta.title).toBe("Book not found");
  });

  it("generateMetadata composes title and description for existing book", async () => {
    vi.spyOn(repo, "findBookById").mockResolvedValue(book);

    const meta = (await generateMetadata({ params: params("99") })) as Metadata;
    expect(meta.title).toBe("Ninety-Nine — Anon");
    expect(meta.description).toMatch(/details for ninety-nine by anon/i);
  });

  it("renders book content when book exists", async () => {
    vi.spyOn(repo, "findBookById").mockResolvedValue(book);

    const input: { params: Promise<{ id: string }> } = { params: params("99") };
    const Comp = await Page(input);
    if (!React.isValidElement(Comp)) {
      throw new Error("Page did not return a valid React element");
    }
    render(Comp);
    expect(
      screen.getByRole("heading", { level: 1, name: /ninety-nine/i }),
    ).toBeInTheDocument();
    expect(
      screen.getByAltText(/cover of ninety-nine by anon/i),
    ).toBeInTheDocument();
  });
});
