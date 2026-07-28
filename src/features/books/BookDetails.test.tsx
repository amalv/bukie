import "@testing-library/jest-dom";
import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import {
  editionFixture,
  partialWorkDetailFixture,
  workDetailFixture,
} from "@/test/catalog-fixtures";
import { BookDetails } from "./BookDetails";

vi.mock("next/image", () => ({
  default: (props: { alt: string; src: string }) => (
    <span role="img" aria-label={props.alt} data-src={props.src} />
  ),
}));

describe("BookDetails", () => {
  it("presents reader-facing identity, description, and useful book facts", () => {
    render(<BookDetails work={workDetailFixture} />);
    const headings = screen.getAllByRole("heading").map((heading) => ({
      level: Number(heading.tagName.slice(1)),
      name: heading.textContent,
    }));
    expect(headings.slice(0, 3)).toEqual([
      { level: 1, name: "Example Work" },
      { level: 2, name: "About the book" },
      { level: 2, name: "Book details" },
    ]);
    expect(screen.getByText("First Author, Second Author")).toBeInTheDocument();
    expect(screen.getByText("Stored catalog description.")).toBeInTheDocument();
    expect(screen.getByText("Example Press")).toBeInTheDocument();
    expect(screen.getByText("978-0-441-17271-9")).toBeInTheDocument();
    expect(
      screen.queryByText(
        /preferred edition|metadata sources|provenance|resolution|stale/i,
      ),
    ).not.toBeInTheDocument();
    expect(screen.queryByText(/rating/i)).not.toBeInTheDocument();
  });

  it("omits unavailable content instead of rendering empty or explanatory sections", () => {
    render(<BookDetails work={partialWorkDetailFixture} />);
    expect(
      screen.queryByRole("heading", { name: "About the book" }),
    ).not.toBeInTheDocument();
    expect(
      screen.queryByRole("heading", { name: "Book details" }),
    ).not.toBeInTheDocument();
    expect(
      screen.queryByRole("heading", { name: "Other editions" }),
    ).not.toBeInTheDocument();
    expect(
      screen.queryByText(
        /description is not available|details are not available/i,
      ),
    ).not.toBeInTheDocument();
    expect(
      screen.getByRole("img", {
        name: "No cover available for Partial Work",
      }),
    ).toBeInTheDocument();
    expect(screen.getByText("Cover not available")).toBeInTheDocument();
  });

  it("offers accurate catalog and category continuation links", () => {
    render(<BookDetails work={workDetailFixture} />);
    const catalogLink = screen.getByRole("link", { name: /back to catalog/i });
    expect(catalogLink).toHaveAttribute("href", "/");
    const fictionLink = screen.getByRole("link", { name: "Fiction" });
    expect(fictionLink).toHaveAttribute("href", "/?category=fiction");
    expect(screen.getByRole("link", { name: "Classics" })).toHaveAttribute(
      "href",
      "/?category=classics",
    );
    fictionLink.focus();
    expect(fictionLink).toHaveFocus();
  });

  it("uses the selected cover only when cover evidence is eligible", () => {
    render(<BookDetails work={workDetailFixture} />);
    expect(
      screen.getByRole("img", {
        name: /cover of example work by first author, second author/i,
      }),
    ).toHaveAttribute("data-src", "/api/media/covers/example.webp");
  });

  it("shows only informative alternate editions", () => {
    const alternate = {
      ...editionFixture,
      id: "20000000-0000-4000-8000-000000000002",
      format: "paperback" as const,
      publication: { date: "2024", precision: "year" as const },
      cover: undefined,
    };
    const empty = {
      id: "20000000-0000-4000-8000-000000000003",
      catalogedAt: 1,
      publishers: [],
      languages: [],
      identifiers: [],
    };
    render(
      <BookDetails
        work={{
          ...workDetailFixture,
          editions: [editionFixture, alternate, empty],
        }}
      />,
    );
    expect(
      screen.getByRole("heading", { level: 2, name: "Other editions" }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("heading", { level: 3, name: "Paperback edition" }),
    ).toBeInTheDocument();
    expect(screen.queryByText("Edition 3")).not.toBeInTheDocument();
  });
});
