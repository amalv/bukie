import {
  ApolloError,
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
const unobserveLoader = (
  loader: React.MutableRefObject<null>,
  observer: IntersectionObserver
) => {
  if (loader.current) {
    observer.unobserve(loader.current);
  }
};

const observeLoader = (
  loader: React.MutableRefObject<null>,
  observer: IntersectionObserver,
  lastPageReached: boolean
) => {
  if (loader.current && observer && !lastPageReached) {
    observer.observe(loader.current);
  }
};

const fetchMoreBooks = (
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
  return fetchMore({
    variables: {
      cursor: data?.books?.cursor,
    },
    updateQuery,
  });
};

const handleFetchMoreBooks = (
  fetchMore: (
    options: FetchMoreQueryOptions<BooksVars, BooksData> &
      FetchMoreOptions<BooksData, BooksVars>
  ) => Promise<ApolloQueryResult<BooksData>>,
  data: BooksData | undefined,
  updateQuery: (
    prev: BooksData,
    { fetchMoreResult }: { fetchMoreResult?: FetchMoreResult }
  ) => BooksData,
  loader: React.MutableRefObject<null>,
  observer: IntersectionObserver,
  lastPageReached: boolean
) => {
  fetchMoreBooks(fetchMore, data, updateQuery).then(() => {
    observeLoader(loader, observer, lastPageReached);
  });
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
  ) => BooksData,
  lastPageReached: boolean
) => {
  return useCallback(
    (observer: IntersectionObserver) => {
      unobserveLoader(loader, observer);
      handleFetchMoreBooks(
        fetchMore,
        data,
        updateQuery,
        loader,
        observer,
        lastPageReached
      );
    },
    [data, fetchMore, loader, updateQuery, lastPageReached]
  );
};
const useHandleError = (error: ApolloError | undefined) => {
  const [isErrorSnackbarOpen, setIsErrorSnackbarOpen] = useState(false);

  useEffect(() => {
    if (error) {
      setIsErrorSnackbarOpen(true);
    }
  }, [error]);

  const handleCloseSnackbar = getCloseSnackbarHandler(setIsErrorSnackbarOpen);

  return { isErrorSnackbarOpen, handleCloseSnackbar };
};

const useHandleLastPageReached = (
  search: string,
  refetch: (
    variables?: Partial<BooksVars> | undefined
  ) => Promise<ApolloQueryResult<BooksData>>,
  limit: number
) => {
  const lastPageReachedRef = useRef(false);
  const [lastPageReached, setLastPageReached] = useState(false);

  useEffect(() => {
    setLastPageReached(false);
    lastPageReachedRef.current = false;
    refetch({ title: search, author: search, limit, cursor: "0" });
  }, [search, refetch, limit]);

  useEffect(() => {
    lastPageReachedRef.current = lastPageReached;
  }, [lastPageReached]);

  return { lastPageReached, setLastPageReached, lastPageReachedRef };
};

export const useBooks = ({ search, limit }: UseBooksProps) => {
  // Fetch books
  const { loading, error, data, fetchMore, refetch } = useQuery<
    BooksData,
    BooksVars
  >(BOOKS_QUERY, {
    variables: { title: search, author: search, limit, cursor: "0" },
  });

  const { isErrorSnackbarOpen, handleCloseSnackbar } = useHandleError(error);
  const { lastPageReached, setLastPageReached, lastPageReachedRef } =
    useHandleLastPageReached(search, refetch, limit);

  const updateQuery = getUpdateQuery(setLastPageReached);
  const loader = useRef(null);
  const handleFetchMore = useHandleFetchMore(
    loader,
    fetchMore,
    data,
    updateQuery,
    lastPageReached
  );

  // If the initial data load returned less than PAGE_SIZE results, set lastPageReached to true
  useEffect(() => {
    if (data && data.books.books.length < PAGE_SIZE) {
      setLastPageReached(true);
    }
  }, [data, setLastPageReached]);

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
