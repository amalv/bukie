import "@testing-library/jest-dom";
import { render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import * as repo from "@/features/books/repo";
import {
  partialWorkDetailFixture,
  workDetailFixture,
} from "@/test/catalog-fixtures";
import BookPage, { buildWorkMetadata, generateMetadata } from "./page";

vi.mock("next/navigation", () => ({
  notFound: vi.fn(() => {
    throw new Error("NEXT_NOT_FOUND");
  }),
}));

describe("work detail page", () => {
  beforeEach(() => vi.restoreAllMocks());

  it("loads canonical detail by work ID with server-rendered structured data", async () => {
    const find = vi
      .spyOn(repo, "findWorkById")
      .mockResolvedValue(workDetailFixture);
    const { container } = render(
      await BookPage({
        params: Promise.resolve({ id: workDetailFixture.id }),
      }),
    );
    expect(
      screen.getByRole("heading", { level: 1, name: workDetailFixture.title }),
    ).toBeInTheDocument();
    expect(find).toHaveBeenCalledWith(workDetailFixture.id);
    const script = container.querySelector(
      'script[type="application/ld+json"]',
    );
    expect(script).toBeInTheDocument();
    expect(JSON.parse(script?.textContent ?? "")).toMatchObject({
      "@context": "https://schema.org",
      "@type": "Book",
      name: "Example Work",
      datePublished: "1965-06",
      author: ["First Author", "Second Author"],
      workExample: [{ datePublished: "2020" }],
    });
  });

  it("builds metadata only from supported normalized facts", async () => {
    vi.spyOn(repo, "findWorkById").mockResolvedValue(workDetailFixture);
    const metadata = await generateMetadata({
      params: Promise.resolve({ id: workDetailFixture.id }),
    });
    expect(metadata).toEqual(buildWorkMetadata(workDetailFixture));
    expect(metadata.title).toContain("Example Work");
    expect(metadata.description).toBe(workDetailFixture.description);
    expect(metadata.alternates?.canonical).toBe(
      `/books/${workDetailFixture.id}`,
    );
  });

  it("omits an ineligible work date while retaining edition structured data", async () => {
    vi.spyOn(repo, "findWorkById").mockResolvedValue({
      ...workDetailFixture,
      firstPublication: undefined,
    });
    const { container } = render(
      await BookPage({
        params: Promise.resolve({ id: workDetailFixture.id }),
      }),
    );
    const script = container.querySelector(
      'script[type="application/ld+json"]',
    );
    const structuredData = JSON.parse(script?.textContent ?? "");
    expect(structuredData).not.toHaveProperty("datePublished");
    expect(structuredData).toMatchObject({
      workExample: [{ datePublished: "2020" }],
    });
    expect(screen.queryByText(/first published/i)).not.toBeInTheDocument();
    expect(screen.getByText("Published")).toBeInTheDocument();
  });

  it("keeps partial metadata factual without inventing a description", () => {
    const metadata = buildWorkMetadata(partialWorkDetailFixture);
    expect(metadata.title).toBe("Partial Work");
    expect(metadata.description).toBe("Partial Work");
    expect(JSON.stringify(metadata)).not.toMatch(
      /full details|rating|publisher|popular/i,
    );
  });
});
