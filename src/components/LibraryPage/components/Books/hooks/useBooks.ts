import {
  ApolloQueryResult,
  FetchMoreQueryOptions,
  FetchMoreOptions,
  useQuery,
} from "@apollo/client";
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

const getCloseSnackbarHandler = (
  setIsErrorSnackbarOpen: React.Dispatch<React.SetStateAction<boolean>>
) => {
  return (_: React.SyntheticEvent | Event, reason?: SnackbarCloseReason) => {
    if (reason === "clickaway") {
      return;
    }

    setIsErrorSnackbarOpen(false);
  };
};

const getUpdateQuery = (
  setLastPageReached: React.Dispatch<React.SetStateAction<boolean>>
) => {
  return (
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
};

const useHandleFetchMore = (
  loader: React.MutableRefObject<null>,
  fetchMore: (
    options: FetchMoreQueryOptions<BooksVars, BooksData> &
      FetchMoreOptions<BooksData, BooksVars>
  ) => Promise<ApolloQueryResult<BooksData>>,
  data: BooksData | undefined,
  updateQuery: (
    prev: BooksData,
    { fetchMoreResult }: { fetchMoreResult?: FetchMoreResult }
  ) => BooksData
) => {
  const lastPageReachedRef = useRef(false);

  return useCallback(
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
    [data, fetchMore, loader, updateQuery]
  );
};

export const useBooks = ({ search, limit }: UseBooksProps) => {
  const lastPageReachedRef = useRef(false);
  const [lastPageReached, setLastPageReached] = useState(false);
  const [isErrorSnackbarOpen, setIsErrorSnackbarOpen] = useState(false);
  // Fetch books
  const { loading, error, data, fetchMore, refetch } = useQuery<
    BooksData,
    BooksVars
  >(BOOKS_QUERY, {
    variables: { title: search, author: search, limit, cursor: "0" },
  });

  useEffect(() => {
    if (error) {
      setIsErrorSnackbarOpen(true);
    }
  }, [error]);

  useEffect(() => {
    setLastPageReached(false);
    lastPageReachedRef.current = false;
    refetch({ title: search, author: search, limit, cursor: "0" });
  }, [search, refetch, limit]);

  const handleCloseSnackbar = getCloseSnackbarHandler(setIsErrorSnackbarOpen);
  const updateQuery = getUpdateQuery(setLastPageReached);
  const loader = useRef(null);
  const handleFetchMore = useHandleFetchMore(
    loader,
    fetchMore,
    data,
    updateQuery
  );

  useEffect(() => {
    lastPageReachedRef.current = lastPageReached;
  }, [lastPageReached]);

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
