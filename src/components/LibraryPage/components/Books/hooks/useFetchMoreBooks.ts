import {
  ApolloQueryResult,
  FetchMoreQueryOptions,
  FetchMoreOptions,
} from "@apollo/client";
import { useRef, useCallback } from "react";
import { BooksData, BooksVars } from "../../../../../data/books";
import { FetchMoreResult } from "./types";

type FetchMoreFunction = (
  options: FetchMoreQueryOptions<BooksVars, BooksData> &
    FetchMoreOptions<BooksData, BooksVars>
) => Promise<ApolloQueryResult<BooksData>>;

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
  fetchMore: FetchMoreFunction,
  data: BooksData | undefined,
  updateQuery: (
    prev: BooksData,
    { fetchMoreResult }: { fetchMoreResult?: FetchMoreResult }
  ) => BooksData
) =>
  fetchMore({
    variables: {
      cursor: data?.books?.cursor,
    },
    updateQuery,
  });

const handleFetchMoreBooks = (
  fetchMore: FetchMoreFunction,
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

export const useFetchMoreBooks = (
  fetchMore: FetchMoreFunction,
  data: BooksData | undefined,
  updateQuery: (
    prev: BooksData,
    { fetchMoreResult }: { fetchMoreResult?: FetchMoreResult }
  ) => BooksData,
  lastPageReached: boolean
) => {
  const loader = useRef(null);

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
    [data, fetchMore, updateQuery, lastPageReached]
  );
};
