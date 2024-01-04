import { useFavoriteButton } from "./useFavoriteButton";
import { StyledIconButton } from "./FavoriteButton.styles";
import Favorite from "@mui/icons-material/Favorite";
import FavoriteBorder from "@mui/icons-material/FavoriteBorder";

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
    >
      {isFavorited ? (
        <Favorite fontSize="large" />
      ) : (
        <FavoriteBorder fontSize="large" />
      )}
    </StyledIconButton>
  );
};
