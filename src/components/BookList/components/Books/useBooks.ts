import { useQuery } from "@apollo/client";
import { useEffect, useRef, useCallback, useState } from "react";
import { BOOKS_QUERY } from "../../../../data/books";

interface UseBooksProps {
  title: string;
  limit: number;
}

export const useBooks = ({ title, limit }: UseBooksProps) => {
  const lastPageReachedRef = useRef(false);
  const [lastPageReached, setLastPageReached] = useState(false);
  const { loading, error, data, fetchMore } = useQuery(BOOKS_QUERY, {
    variables: { title, limit, cursor: "0" },
  });

  const loader = useRef(null);

  useEffect(() => {
    lastPageReachedRef.current = lastPageReached;
  }, [lastPageReached]);

  const handleObserver = useCallback(
    (entities: IntersectionObserverEntry[], observer: IntersectionObserver) => {
      const target = entities[0];
      if (target.isIntersecting && !loading && !lastPageReachedRef.current) {
        observer.unobserve(target.target);

        fetchMore({
          variables: {
            cursor: data?.books?.cursor,
          },
          updateQuery: (prev, { fetchMoreResult }) => {
            if (!fetchMoreResult) return prev;
            const isLastPage = fetchMoreResult.books.books.length < 50;
            setLastPageReached(isLastPage);
            return {
              books: {
                __typename: prev.books.__typename,
                cursor: fetchMoreResult.books.cursor,
                books: [...prev.books.books, ...fetchMoreResult.books.books],
              },
            };
          },
        }).then(() => {
          if (loader.current && observer && !lastPageReachedRef.current) {
            observer.observe(loader.current);
          }
        });
      }
    },
    [data, fetchMore, loading]
  );

  useEffect(() => {
    const options = {
      root: null,
      rootMargin: "20px",
      threshold: 1.0,
    };

    const observer = new IntersectionObserver((entries) => {
      if (observer) {
        handleObserver(entries, observer);
      }
    }, options);

    if (loader.current) {
      observer.observe(loader.current);
    }

    return () => {
      if (loader.current) {
        observer.unobserve(loader.current);
      }
    };
  }, [handleObserver]);

  return { loading, error, data, loader };
};
