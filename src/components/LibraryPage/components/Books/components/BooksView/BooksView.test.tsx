import { MockedProvider } from "@apollo/client/testing";
import { render, screen } from "@testing-library/react";

import { BooksView } from "./BooksView";

describe("BooksView", () => {
  it("renders a list of books when provided", async () => {
    const books = [
      {
        id: "1",
        title: "Book 1",
        author: "Author 1",
        publicationDate: new Date().toLocaleDateString("en-CA"), // 'en-CA' locale results in 'yyyy-mm-dd' format
        image: "image-url-1",
        rating: 4.5,
        ratingsCount: 100,
        isFavorited: false,
      },
      {
        id: "2",
        title: "Book 2",
        author: "Author 2",
        publicationDate: new Date().toLocaleDateString("en-CA"),
        image: "image-url-2",
        rating: 4.0,
        ratingsCount: 200,
        isFavorited: true,
      },
    ];

    render(
      <MockedProvider>
        <BooksView books={books} />
      </MockedProvider>,
    );

    for (const book of books) {
      const titleElement = await screen.findByText(book.title);
      expect(titleElement).toBeInTheDocument();
    }
  });

  it("renders a message when no books are provided", () => {
    render(
      <MockedProvider>
        <BooksView books={[]} />
      </MockedProvider>,
    );
    expect(screen.getByText("No books available")).toBeInTheDocument();
  });
});
