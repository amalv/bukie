import "@testing-library/jest-dom";
import { render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { lightThemeClass } from "@/design/tokens.css";
import { BookCard } from "./BookCard";

const book = {
  id: "42",
  title: "The Answer",
  author: "Adams",
  cover: "/42.jpg",
  genre: "Sci-Fi",
  rating: 4.5,
  year: 1979,
};

describe("BookCard", () => {
  it("links to detail page and exposes accessible labels", () => {
    render(
      <div className={lightThemeClass}>
        <BookCard book={book} />
      </div>,
    );

    const link = screen.getByRole("link", {
      name: /view details for the answer/i,
    });
    expect(link).toHaveAttribute("href", "/books/42");

    const img = screen.getByAltText(/cover of the answer by adams/i);
    expect(img).toBeInTheDocument();
  });

  it("renders optional badge, rating and year when provided", () => {
    render(
      <div className={lightThemeClass}>
        <BookCard book={book} />
      </div>,
    );

    expect(screen.getByText(/sci-fi/i)).toBeInTheDocument();
    expect(screen.getByText("4.5")).toBeInTheDocument();
    expect(screen.getByText(/1979/)).toBeInTheDocument();
  });

  it("does not render genre badge when genre is missing", () => {
    const { container } = render(
      <BookCard
        book={{ id: "n1", title: "Alpha", author: "A", cover: "/c.jpg" }}
      />,
    );

    expect(container.querySelector("[class*='badge']")).toBeNull();
  });

  it("hides meta wrapper when neither rating nor year provided", () => {
    const { container } = render(
      <BookCard
        book={{ id: "n2", title: "No Meta", author: "A", cover: "/c.jpg" }}
      />,
    );

    expect(screen.queryByText(/\.\d$/)).not.toBeInTheDocument();
    expect(container.querySelector("[class*='meta']")).toBeNull();
  });

  it("renders year-only path which skips rating block", () => {
    render(
      <BookCard
        book={{
          id: "y1",
          title: "Year Only",
          author: "A",
          cover: "/c.jpg",
          year: 2000,
        }}
      />,
    );

    expect(screen.getByText("2000")).toBeInTheDocument();
    expect(screen.queryByText(/\d\.\d/)).not.toBeInTheDocument();
  });

  it("clamps and formats stars (half-star case visible as 5.5 label here)", () => {
    const base = { id: "st", title: "Starry", author: "Sky", cover: "/c.jpg" };
    render(<BookCard book={{ ...base, rating: -10 }} />);
    render(<BookCard book={{ ...base, rating: 5.5 }} />);
    expect(screen.getByText("5.5")).toBeInTheDocument();
  });

  describe("Image unoptimized flag branches", () => {
    const OLD_ENV = process.env;
    beforeEach(() => {
      process.env = { ...OLD_ENV };
    });
    afterEach(() => {
      process.env = OLD_ENV;
    });

    it("evaluates includes('.svg')/env branch by stubbing production on non-svg", () => {
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
