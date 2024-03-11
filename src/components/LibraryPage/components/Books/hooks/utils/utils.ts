import type { SnackbarCloseReason } from "@mui/material";

import type { FetchMoreResult } from "../types";

import type { BooksData } from "@/data/books";

const PAGE_SIZE = 50;

export const getCloseSnackbarHandler = (
  setIsErrorSnackbarOpen: React.Dispatch<React.SetStateAction<boolean>>,
) => {
  return (_: React.SyntheticEvent | Event, reason?: SnackbarCloseReason) => {
    if (reason === "clickaway") {
      return;
    }

    setIsErrorSnackbarOpen(false);
  };
};

export const getUpdateQuery = (
  setLastPageReached: React.Dispatch<React.SetStateAction<boolean>>,
) => {
  return (
    prev: BooksData,
    { fetchMoreResult }: { fetchMoreResult?: FetchMoreResult },
  ) => {
    if (!fetchMoreResult) return prev;
    const isLastPage = fetchMoreResult.books.books.length < PAGE_SIZE;
    setLastPageReached(isLastPage);

    return {
      books: {
        __typename: prev.books.__typename,
        cursor: fetchMoreResult.books.cursor,
        books: [...prev.books.books, ...fetchMoreResult.books.books],
      },
    };
  };
};
