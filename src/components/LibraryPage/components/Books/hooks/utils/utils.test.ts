import { getCloseSnackbarHandler, getUpdateQuery } from "./utils";
import { BooksData } from "@/data/books";
import { FetchMoreResult } from "../types";
import { vi } from "vitest";

describe("utils", () => {
  describe("getCloseSnackbarHandler", () => {
    it("should close the snackbar when not clicked away", () => {
      const setIsErrorSnackbarOpen = vi.fn();
      const handler = getCloseSnackbarHandler(setIsErrorSnackbarOpen);
      handler({}, "escapeKeyDown");
      expect(setIsErrorSnackbarOpen).toHaveBeenCalledWith(false);
    });

    it("should not close the snackbar when clicked away", () => {
      const setIsErrorSnackbarOpen = vi.fn();
      const handler = getCloseSnackbarHandler(setIsErrorSnackbarOpen);
      handler({}, "clickaway");
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
          books: ["book1", "book2"],
        },
      };
      const fetchMoreResult: FetchMoreResult = {
        books: {
          __typename: "Books",
          cursor: "cursor2",
          books: ["book3"],
        },
      };
      const result = updateQuery(prev, { fetchMoreResult });
      expect(setLastPageReached).toHaveBeenCalledWith(true);
      expect(result).toEqual({
        books: {
          __typename: "Books",
          cursor: "cursor2",
          books: ["book1", "book2", "book3"],
        },
      });
    });
  });
});
