import Favorite from "@mui/icons-material/Favorite";
import FavoriteBorder from "@mui/icons-material/FavoriteBorder";

import { useFavoriteButton } from "./hooks";
import { StyledIconButton } from "./FavoriteButton.styles";

interface FavoriteButtonProps {
  bookId: string;
  isFavorited: boolean;
}

export const FavoriteButton: React.FC<FavoriteButtonProps> = ({
  bookId,
  isFavorited: initialIsFavorited,
}) => {
  const { handleFavoriteClick, isFavorited } = useFavoriteButton(
    bookId,
    initialIsFavorited
  );

  return (
    <StyledIconButton
      style={{ color: isFavorited ? "red" : "gray", zIndex: 1 }}
      onClick={handleFavoriteClick}
      aria-label={isFavorited ? "Remove from favorites" : "Add to favorites"}
    >
      {isFavorited ? (
        <Favorite fontSize="large" />
      ) : (
        <FavoriteBorder fontSize="large" />
      )}
    </StyledIconButton>
  );
};
