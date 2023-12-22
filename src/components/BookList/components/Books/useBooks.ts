import { useQuery } from "@apollo/client";
import { useEffect, useMemo, useRef, useCallback, useState } from "react";
import {
  BOOKS_QUERY,
  BooksData,
  BooksVars,
  Book,
} from "../../../../data/books";

const PAGE_SIZE = 50;
const ROOT_MARGIN = "20px";

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
  // State and refs
  const lastPageReachedRef = useRef(false);
  const [lastPageReached, setLastPageReached] = useState(false);

  // Fetch books
  const { loading, error, data, fetchMore } = useQuery<BooksData, BooksVars>(
    BOOKS_QUERY,
    {
      variables: { title: search, author: search, limit, cursor: "0" },
    }
  );

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

  // Handle intersection events
  const handleObserver = useCallback(
    (entities: IntersectionObserverEntry[], observer: IntersectionObserver) => {
      const target = entities[0];
      if (target.isIntersecting && !loading && !lastPageReachedRef.current) {
        handleFetchMore(observer);
      }
    },
    [loading, handleFetchMore]
  );

  // Intersection observer options
  const options = useMemo(
    () => ({
      root: null,
      rootMargin: ROOT_MARGIN,
      threshold: 1.0,
    }),
    []
  );

  // Set up intersection observer
  useEffect(() => {
    const observer = new IntersectionObserver((entries) => {
      if (observer) {
        handleObserver(entries, observer);
      }
    }, options);

    const currentLoader = loader.current;

    if (currentLoader) {
      observer.observe(currentLoader);
    }

    return () => {
      if (currentLoader) {
        observer.unobserve(currentLoader);
      }
    };
  }, [handleObserver, options]);

  return { loading, error, data, loader };
};
