import "@testing-library/jest-dom";
import { render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { lightThemeClass } from "@/design/tokens";
import { BookCard } from "./BookCard";

const book = {
  id: "42",
  title: "The Answer",
  author: "Adams",
  authors: ["Douglas Adams", "Another Author", "Third Author"],
  cover: "/42.jpg",
  genre: "Science Fiction",
  rating: 4.5,
  ratingsCount: 12847,
  year: 1979,
};

describe("BookCard", () => {
  it("exposes one canonical detail link and a decorative cover", () => {
    const { container } = render(
      <div className={lightThemeClass}>
        <BookCard book={book} />
      </div>,
    );

    const link = screen.getByRole("link", {
      name: "View details for The Answer",
    });
    expect(link).toHaveAttribute("href", "/books/42");
    expect(screen.getAllByRole("link")).toHaveLength(1);
    expect(container.querySelector("img")).toHaveAttribute("alt", "");
  });

  it("renders ordered authors and supported bibliographic metadata", () => {
    render(<BookCard book={book} />);

    expect(
      screen.getByText("Douglas Adams · Another Author and 1 more"),
    ).toBeVisible();
    expect(
      screen.getByText("Douglas Adams, Another Author, Third Author"),
    ).toHaveClass("sr-only");
    expect(screen.getByText("Science Fiction · 1979")).toBeVisible();
  });

  it("does not trust raw catalog rating fields automatically", () => {
    render(<BookCard book={book} />);

    expect(screen.queryByText(/4\.5/)).not.toBeInTheDocument();
    expect(screen.queryByText(/12,847 ratings/)).not.toBeInTheDocument();
  });

  it("renders an explicitly eligible rating with its sample size", () => {
    const { container } = render(
      <BookCard
        book={book}
        ratingPresentation={{ state: "eligible", average: 4.46, count: 12847 }}
      />,
    );

    expect(screen.getByText("4.5 · 12,847 ratings")).toBeVisible();
    expect(
      screen.getByText("Rating 4.5 out of 5 from 12,847 ratings"),
    ).toHaveClass("sr-only");
    expect(container.querySelectorAll(".book-card-star-icon")).toHaveLength(1);
  });

  it.each([
    ["unrated", "Not rated"],
    ["unavailable", "Rating unavailable"],
  ] as const)("renders the explicit %s rating state", (state, label) => {
    render(<BookCard book={book} ratingPresentation={{ state }} />);

    expect(
      screen.getByText(label, { selector: "[aria-hidden='true']" }),
    ).toBeVisible();
    expect(screen.queryByText(/4\.5/)).not.toBeInTheDocument();
  });

  it("collapses missing metadata without separators or invented content", () => {
    const { container } = render(
      <BookCard
        book={{
          id: "minimal",
          title: "Minimal",
          author: "",
          cover: "",
          description: "Not card content",
        }}
      />,
    );

    expect(screen.getByText("Minimal")).toBeVisible();
    expect(screen.queryByText("Not card content")).not.toBeInTheDocument();
    expect(container).not.toHaveTextContent("·");
    expect(container.querySelector("img")).toHaveAttribute(
      "src",
      expect.stringContaining("placeholder.svg"),
    );
  });

  it("renders the compact treatment without changing its link semantics", () => {
    const { container } = render(
      <BookCard book={book} presentation="compact" />,
    );

    expect(container.querySelector("article")).toHaveAttribute(
      "data-presentation",
      "compact",
    );
    expect(screen.getAllByRole("link")).toHaveLength(1);
  });

  describe("Image unoptimized flag branches", () => {
    const OLD_ENV = process.env;
    beforeEach(() => {
      process.env = { ...OLD_ENV };
    });
    afterEach(() => {
      process.env = OLD_ENV;
    });

    it("evaluates the production non-SVG image branch", () => {
      vi.stubEnv("NODE_ENV", "production");
      render(
        <BookCard
          book={{ id: "i", title: "Img", author: "A", cover: "/cover.png" }}
        />,
      );
      vi.unstubAllEnvs();
    });
  });
});
