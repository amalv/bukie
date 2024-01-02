import { useState, useEffect, useCallback } from "react";
import { useAuth0 } from "@auth0/auth0-react";
import { useFavorite } from "../useFavorite";
import { FetchResult } from "@apollo/client";

type FavoriteAction = (arg: {
  variables: { bookId: string };
}) => Promise<FetchResult>;

const handleFavorite = (
  action: FavoriteAction,
  bookId: string,
  setIsFavorited: (favorited: boolean) => void,
  favorited: boolean
) => {
  action({ variables: { bookId } });
  setIsFavorited(favorited);
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
    handleFavorite(
      isFavorited ? removeFavorite : addFavorite,
      bookId,
      setIsFavorited,
      !isFavorited
    );
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
