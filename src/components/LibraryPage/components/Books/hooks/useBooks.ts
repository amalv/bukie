import { useEffect, useRef, useState } from "react";
import { useAuth } from "@/contexts";
import { useAuth0 } from "@auth0/auth0-react";
import { ApolloError, useQuery } from "@apollo/client";
import { BOOKS_QUERY, BooksData, BooksVars } from "@/data/books";
import { useIntersectionObserver } from "./useIntersectionObserver";
import { getCloseSnackbarHandler, getUpdateQuery } from "./utils";
import { useFetchMoreBooks } from "./useFetchMoreBooks";

const PAGE_SIZE = 50;

interface UseBooksProps {
  search: string;
  limit: number;
}

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
  limit: number,
  isAuthenticated: boolean
) => {
  const lastPageReachedRef = useRef(false);
  const [lastPageReached, setLastPageReached] = useState(false);

  useEffect(() => {
    setLastPageReached(false);
    lastPageReachedRef.current = false;
  }, [search, limit, isAuthenticated]);

  useEffect(() => {
    lastPageReachedRef.current = lastPageReached;
  }, [lastPageReached]);

  return { lastPageReached, setLastPageReached, lastPageReachedRef };
};

export const useBooks = ({ search, limit }: UseBooksProps) => {
  const { isAuthenticated } = useAuth0();
  const { token } = useAuth();
  const tokenRef = useRef(token);
  console.log("useBooks token: ", token);

  const { loading, error, data, fetchMore, refetch } = useQuery<
    BooksData,
    BooksVars
  >(BOOKS_QUERY, {
    variables: { title: search, author: search, limit, cursor: "0" },
  });

  useEffect(() => {
    if (token && token !== tokenRef.current) {
      console.log("token changed");
      refetch();
    }
    tokenRef.current = token;
  }, [token, refetch]);

  const { isErrorSnackbarOpen, handleCloseSnackbar } = useHandleError(error);
  const { lastPageReached, setLastPageReached, lastPageReachedRef } =
    useHandleLastPageReached(search, limit, isAuthenticated);

  const updateQuery = getUpdateQuery(setLastPageReached);
  const loader = useRef(null);

  const handleFetchMore = useFetchMoreBooks(
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
