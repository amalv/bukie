import "@testing-library/jest-dom";
import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { lightThemeClass } from "@/design/tokens.css";
import { BookCard } from "./BookCard";

const book = {
  id: "42",
  title: "The Answer",
  author: "Adams",
  cover: "/42.jpg",
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
});
