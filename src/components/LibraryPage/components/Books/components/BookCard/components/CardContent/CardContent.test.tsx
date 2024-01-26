import { render, screen } from "@testing-library/react";

import { CardContent } from "./CardContent";

import { Book } from "@/data/books";

describe("CardContent", () => {
  it("renders correctly", () => {
    const book: Book = {
      id: "1",
      title: "Test Book",
      author: "Test Author",
      isFavorited: false,
      publicationDate: "2022-01-01",
      image: "https://test.com/test.jpg",
      rating: 80,
      ratingsCount: 100,
    };

    render(<CardContent book={book} />);

    expect(screen.getByText("Test Book")).toBeInTheDocument();
    expect(screen.getByText("Test Author")).toBeInTheDocument();
    expect(screen.getByText(/2022/)).toBeInTheDocument(); // Use a regex to match the year
    expect(screen.getByRole("img", { name: "Test Book" })).toHaveAttribute(
      "src",
      "https://test.com/test.jpg",
    );
    expect(screen.getByLabelText(`${book.rating}%`)).toBeInTheDocument();
  });
});
