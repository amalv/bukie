import { render, screen, waitFor } from "@testing-library/react";
import { MockedProvider } from "@apollo/client/testing";
import { describe, expect, it } from "vitest";
import { BOOKS_QUERY } from "../../data/books";
import { BookList } from "./BookList";

const mocks = [
  {
    request: {
      query: BOOKS_QUERY,
      variables: { title: "", limit: 50 },
    },
    result: {
      data: {
        books: {
          cursor: "3",
          books: [
            {
              id: "1",
              title: "1984",
              author: "George Orwell",
              publicationDate: "1949-06-08",
              image: null,
              rating: 85,
              ratingsCount: 123,
              __typename: "Book",
            },
            {
              id: "2",
              title: "The Great Gatsby",
              author: "F. Scott Fitzgerald",
              publicationDate: "1925-04-10",
              image: null,
              rating: 88,
              ratingsCount: 200,
              __typename: "Book",
            },
            {
              id: "3",
              title: "To Kill a Mockingbird",
              author: "Harper Lee",
              publicationDate: "1960-07-11",
              image: null,
              rating: 90,
              ratingsCount: 250,
              __typename: "Book",
            },
          ],
        },
      },
    },
  },
];

describe("BookList", () => {
  it("renders a list of books", async () => {
    render(
      <MockedProvider mocks={mocks} addTypename={false}>
        <BookList />
      </MockedProvider>
    );

    const expectedTitles = mocks[0].result.data.books.books.map(
      (book) => book.title
    );

    for (const title of expectedTitles) {
      await waitFor(() => {
        expect(screen.getByText(title)).toBeInTheDocument();
      });
    }
  });
});
