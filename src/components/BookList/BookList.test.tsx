import { render } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { Book } from "../../data/books";
import BookList from "./BookList";

describe("BookList", () => {
  it("renders a list of books", () => {
    vi.mock("../../data/books", () => ({
      books: [
        {
          title: "The Great Gatsby",
          author: "F. Scott Fitzgerald",
          year: "1925",
          image: "https://picsum.photos/150/150",
          rating: 80,
        },
        {
          title: "To Kill a Mockingbird",
          author: "Harper Lee",
          year: "1960",
          image: "https://picsum.photos/150/150",
          rating: 90,
        },
        {
          title: "1984",
          author: "George Orwell",
          year: "1949",
          image: "https://picsum.photos/150/150",
          rating: 70,
        },
      ] as Book[],
    }));

    const { getAllByRole } = render(<BookList />);
    const bookTitles = getAllByRole("heading").map((heading) => heading.textContent);

    expect(bookTitles).toEqual(["The Great Gatsby", "To Kill a Mockingbird", "1984"]);
  });
});
