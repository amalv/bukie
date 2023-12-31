import { useEffect, useState, useCallback } from "react";
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
    const action = isFavorited ? removeFavorite : addFavorite;
    action({ variables: { bookId } });
    setIsFavorited(!isFavorited);
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
