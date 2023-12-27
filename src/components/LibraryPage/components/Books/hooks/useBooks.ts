import { useQuery } from "@apollo/client";
import { useEffect, useRef, useCallback, useState } from "react";
import { SnackbarCloseReason } from "@mui/material";
import {
  BOOKS_QUERY,
  BooksData,
  BooksVars,
  Book,
} from "../../../../../data/books";
import { useIntersectionObserver } from "./useIntersectionObserver";

const PAGE_SIZE = 50;

interface FetchMoreResult {
  books: {
    __typename: string;
    cursor: string;
    books: Book[];
  };
}
interface UseBooksProps {
  search: string;
  limit: number;
}

export const useBooks = ({ search, limit }: UseBooksProps) => {
  const lastPageReachedRef = useRef(false);
  const [lastPageReached, setLastPageReached] = useState(false);
  const [isErrorSnackbarOpen, setIsErrorSnackbarOpen] = useState(false);
  // Fetch books
  const { loading, error, data, fetchMore } = useQuery<BooksData, BooksVars>(
    BOOKS_QUERY,
    {
      variables: { title: search, author: search, limit, cursor: "0" },
    }
  );

  useEffect(() => {
    if (error) {
      setIsErrorSnackbarOpen(true);
    }
  }, [error]);

  const handleCloseSnackbar = (
    _: React.SyntheticEvent | Event,
    reason?: SnackbarCloseReason
  ) => {
    if (reason === "clickaway") {
      return;
    }

    setIsErrorSnackbarOpen(false);
  };

  // Update query with new data
  const updateQuery = (
    prev: BooksData,
    { fetchMoreResult }: { fetchMoreResult?: FetchMoreResult }
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

  const loader = useRef(null);

  useEffect(() => {
    lastPageReachedRef.current = lastPageReached;
  }, [lastPageReached]);

  // Fetch more books when loader is visible
  const handleFetchMore = useCallback(
    (observer: IntersectionObserver) => {
      if (loader.current) {
        observer.unobserve(loader.current);
      }

      fetchMore({
        variables: {
          cursor: data?.books?.cursor,
        },
        updateQuery,
      }).then(() => {
        if (loader.current && observer && !lastPageReachedRef.current) {
          observer.observe(loader.current);
        }
      });
    },
    [data, fetchMore]
  );

  useIntersectionObserver(loader, handleFetchMore, loading, lastPageReachedRef);

  return {
    isErrorSnackbarOpen,
    handleCloseSnackbar,
    loading,
    error,
    data,
    loader,
  };
};
