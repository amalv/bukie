import { useEffect, useRef, useState, useCallback } from "react";
import { useAuth0 } from "@auth0/auth0-react";
import { ApolloError, useQuery } from "@apollo/client";
import { BOOKS_QUERY, BooksData, BooksVars } from "@/data/books";
import { FavoritesData, GET_FAVORITES_QUERY } from "@/data/favorites";
import { useIntersectionObserver } from "./useIntersectionObserver";
import { getCloseSnackbarHandler, getUpdateQuery } from "./utils";
import { useFetchMoreBooks } from "./useFetchMoreBooks";
import { useAuth } from "@/contexts";

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
  isAuthenticated: boolean,
  favoritesLoading: boolean
) => {
  const lastPageReachedRef = useRef(false);
  const [lastPageReached, setLastPageReached] = useState(false);

  useEffect(() => {
    setLastPageReached(false);
    lastPageReachedRef.current = false;
  }, [search, limit, isAuthenticated, favoritesLoading]);

  useEffect(() => {
    lastPageReachedRef.current = lastPageReached;
  }, [lastPageReached]);

  return { lastPageReached, setLastPageReached, lastPageReachedRef };
};

export const useBooks = ({ search, limit }: UseBooksProps) => {
  const { isAuthenticated } = useAuth0();
  const { token } = useAuth();
  const tokenRef = useRef(token);

  const { loading, error, data, fetchMore } = useQuery<BooksData, BooksVars>(
    BOOKS_QUERY,
    {
      variables: { title: search, author: search, limit, cursor: "0" },
    }
  );

  // Fetch user favorites
  const {
    loading: favoritesLoading,
    error: favoritesError,
    data: favoritesData,
    refetch: refetchFavorites,
  } = useQuery<FavoritesData>(GET_FAVORITES_QUERY, {
    skip: !token,
  });

  useEffect(() => {
    if (token && token !== tokenRef.current) {
      refetchFavorites();
    }
    tokenRef.current = token;
  }, [refetchFavorites, token]);

  const { isErrorSnackbarOpen, handleCloseSnackbar } = useHandleError(error);
  const {
    isErrorSnackbarOpen: isFavoritesErrorSnackbarOpen,
    handleCloseSnackbar: handleCloseFavoritesSnackbar,
  } = useHandleError(favoritesError);
  const { lastPageReached, setLastPageReached, lastPageReachedRef } =
    useHandleLastPageReached(search, limit, isAuthenticated, favoritesLoading);

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

  const isBookFavorited = useCallback(
    (bookId: string) => {
      const userFavorites = favoritesData?.user?.favorites || [];
      return userFavorites.some((favorite) => favorite.book.id === bookId);
    },
    [favoritesData]
  );

  return {
    isBookFavorited,
    isErrorSnackbarOpen,
    isFavoritesErrorSnackbarOpen,
    handleCloseSnackbar,
    handleCloseFavoritesSnackbar,
    loading,
    favoritesLoading,
    error,
    favoritesError,
    data,
    favoritesData,
    loader,
  };
};
