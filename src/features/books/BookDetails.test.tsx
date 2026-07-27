import "@testing-library/jest-dom";
import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { workDetailFixture, workSummaryFixture } from "@/test/catalog-fixtures";
import { BookDetails } from "./BookDetails";

vi.mock("next/image", () => ({
  default: (props: { alt: string; src: string }) => (
    <span role="img" aria-label={props.alt} data-src={props.src} />
  ),
}));

describe("BookDetails", () => {
  it("renders stored work and preferred-edition facts", () => {
    render(<BookDetails work={workDetailFixture} />);
    expect(
      screen.getByRole("heading", { level: 1, name: "Example Work" }),
    ).toBeInTheDocument();
    expect(
      screen.getAllByText(/First Author, Second Author/).length,
    ).toBeGreaterThan(0);
    expect(screen.getByText("Stored catalog description.")).toBeInTheDocument();
    expect(screen.getByText("Example Press")).toBeInTheDocument();
    expect(screen.getByText("978-0-441-17271-9")).toBeInTheDocument();
  });

  it("omits unavailable and invented facts", () => {
    const partial = {
      ...workSummaryFixture,
      authors: [],
      primaryCategory: undefined,
      preferredEdition: {
        id: "edition-missing",
        catalogedAt: 1,
        publishers: [],
        languages: [],
        identifiers: [],
      },
      categories: [],
      editions: [],
    };
    const { container } = render(<BookDetails work={partial} />);
    expect(
      screen.queryByRole("heading", { name: /about this book/i }),
    ).not.toBeInTheDocument();
    expect(container.textContent).not.toMatch(
      /full details|rating|publisher:|isbn:/i,
    );
  });

  it("uses the selected provider-neutral cover key", () => {
    render(<BookDetails work={workDetailFixture} />);
    expect(
      screen.getByRole("img", { name: /cover of example work/i }),
    ).toHaveAttribute("data-src", "/api/media/covers/example.webp");
  });
});
