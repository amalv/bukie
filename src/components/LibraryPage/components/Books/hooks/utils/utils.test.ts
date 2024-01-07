import { getCloseSnackbarHandler, getUpdateQuery } from "./utils";
import { BooksData } from "@/data/books";
import { FetchMoreResult } from "../types";
import { vi } from "vitest";

describe("utils", () => {
  describe("getCloseSnackbarHandler", () => {
    it("should close the snackbar when not clicked away", () => {
      const setIsErrorSnackbarOpen = vi.fn();
      const handler = getCloseSnackbarHandler(setIsErrorSnackbarOpen);
      const mockEvent = new Event("test-event");
      handler(mockEvent, "escapeKeyDown");
      expect(setIsErrorSnackbarOpen).toHaveBeenCalledWith(false);
    });

    it("should not close the snackbar when clicked away", () => {
      const setIsErrorSnackbarOpen = vi.fn();
      const handler = getCloseSnackbarHandler(setIsErrorSnackbarOpen);
      const mockEvent = new Event("test-event");
      handler(mockEvent, "clickaway");
      expect(setIsErrorSnackbarOpen).not.toHaveBeenCalled();
    });
  });

  describe("getUpdateQuery", () => {
    it("should update the query and set last page reached", () => {
      const setLastPageReached = vi.fn();
      const updateQuery = getUpdateQuery(setLastPageReached);
      const prev: BooksData = {
        books: {
          __typename: "Books",
          cursor: "cursor1",
          books: [
            {
              id: "1",
              title: "book1",
              author: "author1",
              isFavorited: false,
              publicationDate: "2022-01-01",
              image: "https://test.com/test1.jpg",
              rating: 80,
              ratingsCount: 100,
            },
            {
              id: "2",
              title: "book2",
              author: "author2",
              isFavorited: false,
              publicationDate: "2022-01-02",
              image: "https://test.com/test2.jpg",
              rating: 85,
              ratingsCount: 200,
            },
          ],
        },
      };
      const fetchMoreResult: FetchMoreResult = {
        books: {
          __typename: "Books",
          cursor: "cursor2",
          books: [
            {
              id: "3",
              title: "book3",
              author: "author3",
              isFavorited: false,
              publicationDate: "2022-01-03",
              image: "https://test.com/test3.jpg",
              rating: 90,
              ratingsCount: 300,
            },
          ],
        },
      };
      const result = updateQuery(prev, { fetchMoreResult });
      expect(setLastPageReached).toHaveBeenCalledWith(true);
      expect(result).toEqual({
        books: {
          __typename: "Books",
          cursor: "cursor2",
          books: [...prev.books.books, ...fetchMoreResult.books.books],
        },
      });
    });
  });
});
