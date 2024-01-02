import { useState, useEffect, useCallback } from "react";
import { useAuth0 } from "@auth0/auth0-react";
import { useFavorite } from "../useFavorite";
import { FetchResult } from "@apollo/client";

const handleAddFavorite = (
  addFavorite: (arg: { variables: { bookId: string } }) => Promise<FetchResult>,
  bookId: string,
  setIsFavorited: (favorited: boolean) => void
) => {
  addFavorite({ variables: { bookId } });
  setIsFavorited(true);
};

const handleRemoveFavorite = (
  removeFavorite: (arg: {
    variables: { bookId: string };
  }) => Promise<FetchResult>,
  bookId: string,
  setIsFavorited: (favorited: boolean) => void
) => {
  removeFavorite({ variables: { bookId } });
  setIsFavorited(false);
};

export const useFavoriteButton = (
  bookId: string,
  initialIsFavorited: boolean
) => {
  const { user, loginWithRedirect } = useAuth0();
  const { addFavorite, removeFavorite } = useFavorite();
  const [isFavorited, setIsFavorited] = useState(initialIsFavorited);

  useEffect(() => {
    setIsFavorited(initialIsFavorited);
  }, [initialIsFavorited]);

  const handleFavoriteClick = useCallback(() => {
    if (!user) {
      loginWithRedirect();
      return;
    }
    isFavorited
      ? handleRemoveFavorite(removeFavorite, bookId, setIsFavorited)
      : handleAddFavorite(addFavorite, bookId, setIsFavorited);
  }, [
    user,
    isFavorited,
    loginWithRedirect,
    bookId,
    addFavorite,
    removeFavorite,
  ]);

  return { isFavorited, handleFavoriteClick };
};
