import { MockedProvider } from "@apollo/client/testing";
import { render, screen } from "@testing-library/react";

import type { Book } from "../../../../../../data/books";

import { BookCard } from "./BookCard";

test("renders book information correctly", async () => {
  const mockBook: Book = {
    id: "1",
    title: "Test Book",
    author: "Test Author",
    isFavorited: false,
    publicationDate: "2000-01-01",
    image: "https://example.com/image.jpg",
    rating: 80,
    ratingsCount: 100,
  };

  render(
    <MockedProvider>
      <BookCard book={mockBook} />
    </MockedProvider>,
  );

  expect(await screen.findByText(mockBook.title)).toBeInTheDocument();
  expect(await screen.findByText(mockBook.author)).toBeInTheDocument();
  expect(await screen.findByText("2000")).toBeInTheDocument();
});
