import { render, screen } from "@testing-library/react";
import { BooksView } from "./BooksView";

describe("BooksView", () => {
  it("renders a list of books when provided", () => {
    const books = [
      {
        id: "1",
        title: "Book 1",
        author: "Author 1",
        publicationDate: new Date().toLocaleDateString("en-CA"), // 'en-CA' locale results in 'yyyy-mm-dd' format
        image: "image-url-1",
        rating: 4.5,
        ratingsCount: 100,
      },
      {
        id: "2",
        title: "Book 2",
        author: "Author 2",
        publicationDate: new Date().toLocaleDateString("en-CA"),
        image: "image-url-2",
        rating: 4.0,
        ratingsCount: 200,
      },
    ];

    render(<BooksView books={books} />);

    books.forEach((book) => {
      expect(screen.getByText(book.title)).toBeInTheDocument();
    });
  });

  it("renders a message when no books are provided", () => {
    render(<BooksView books={[]} />);
    expect(screen.getByText("No books available")).toBeInTheDocument();
  });
});
