import { useFavoriteButton } from "./useFavoriteButton";
import { StyledIconButton } from "./FavoriteButton.styles";
import Favorite from "@mui/icons-material/Favorite";
import FavoriteBorder from "@mui/icons-material/FavoriteBorder";

interface FavoriteButtonProps {
  bookId: string;
  isFavorited: boolean;
}

const FavoritedButton: React.FC<{ onClick: () => void }> = ({ onClick }) => (
  <StyledIconButton style={{ color: "red", zIndex: 1 }} onClick={onClick}>
    <Favorite fontSize="large" />
  </StyledIconButton>
);

const NonFavoritedButton: React.FC<{ onClick: () => void }> = ({ onClick }) => (
  <StyledIconButton style={{ color: "gray", zIndex: 1 }} onClick={onClick}>
    <FavoriteBorder fontSize="large" />
  </StyledIconButton>
);

export const FavoriteButton: React.FC<FavoriteButtonProps> = ({
  bookId,
  isFavorited: initialIsFavorited,
}) => {
  const { isFavorited, handleFavoriteClick } = useFavoriteButton(
    bookId,
    initialIsFavorited
  );

  return isFavorited ? (
    <FavoritedButton onClick={handleFavoriteClick} />
  ) : (
    <NonFavoritedButton onClick={handleFavoriteClick} />
  );
};
