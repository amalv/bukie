import { render, screen } from "@testing-library/react";
import { BookCard } from "./BookCard";
import { Book } from "../../../../../../data/books";

test("renders book information correctly", async () => {
  const mockBook: Book = {
    id: "1",
    title: "Test Book",
    author: "Test Author",
    publicationDate: "2000-01-01",
    image: "https://example.com/image.jpg",
    rating: 80,
    ratingsCount: 100,
  };

  render(<BookCard book={mockBook} />);

  expect(await screen.findByText(mockBook.title)).toBeInTheDocument();
  expect(await screen.findByText(mockBook.author)).toBeInTheDocument();
  expect(await screen.findByText("2000")).toBeInTheDocument();
});
