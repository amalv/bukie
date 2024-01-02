import { useAuth0 } from "@auth0/auth0-react";
import { useState, useEffect, useCallback } from "react";
import { IconButton } from "@mui/material";
import Favorite from "@mui/icons-material/Favorite";
import FavoriteBorder from "@mui/icons-material/FavoriteBorder";
import { useFavorite } from "../useFavorite";

interface FavoriteButtonProps {
  bookId: string;
  isFavorited: boolean;
}

export const FavoriteButton: React.FC<FavoriteButtonProps> = ({
  bookId,
  isFavorited: initialIsFavorited,
}) => {
  const { user, loginWithRedirect } = useAuth0();
  const [isFavorited, setIsFavorited] = useState(initialIsFavorited);
  const { addFavorite, removeFavorite } = useFavorite();

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

  return (
    <IconButton
      style={{
        position: "absolute",
        top: 0,
        right: 0,
        transform: "translate(40%, -40%)",
        color: isFavorited ? "red" : "gray",
        zIndex: 1,
      }}
      onClick={handleFavoriteClick}
    >
      {isFavorited ? (
        <Favorite fontSize="large" />
      ) : (
        <FavoriteBorder fontSize="large" />
      )}
    </IconButton>
  );
};
