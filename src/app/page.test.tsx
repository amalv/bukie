import "@testing-library/jest-dom";
import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { lightThemeClass } from "@/design/tokens.css";
import { BookList } from "@/features/books/BookList";

describe("Home page UI", () => {
  it("renders a grid of books (basic UI smoke)", () => {
    render(
      <div className={lightThemeClass}>
        <BookList books={[{ id: "1", title: "A", author: "B", cover: "x" }]} />
      </div>,
    );
    expect(screen.getByText("A")).toBeInTheDocument();
    expect(screen.getByText("B")).toBeInTheDocument();
  });
});
