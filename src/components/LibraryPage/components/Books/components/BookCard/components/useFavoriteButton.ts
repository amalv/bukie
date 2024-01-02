import { useState, useEffect, useCallback } from "react";
import { useAuth0 } from "@auth0/auth0-react";
import { useFavorite } from "../useFavorite";

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
    if (isFavorited) {
      removeFavorite({ variables: { bookId } });
    } else {
      addFavorite({ variables: { bookId } });
    }
    setIsFavorited(!isFavorited);
  }, [
    user,
    isFavorited,
    bookId,
    addFavorite,
    removeFavorite,
    loginWithRedirect,
  ]);

  return { isFavorited, handleFavoriteClick };
};
