import { useAuth0 } from "@auth0/auth0-react";
import { useState, useEffect } from "react";
import { Box, Grid, Typography, IconButton } from "@mui/material";
import { faker } from "@faker-js/faker";
import {
  CardWrapper,
  InfoWrapper,
  Cover,
  TextWrapper,
  CardActionAreaWrapper,
} from "./BookCard.styles";
import { CircularProgressWithLabel } from "./components";
import { Book } from "../../../../../../data/books";
import Favorite from "@mui/icons-material/Favorite";
import FavoriteBorder from "@mui/icons-material/FavoriteBorder";
import { useFavorite } from "./useFavorite";

const getYear = (dateString: string): string => {
  const date = new Date(dateString);
  return date.getFullYear().toString();
};

interface BookCardProps {
  book: Book;
  isFavorited: boolean;
}

export const BookCard: React.FC<BookCardProps> = ({
  book,
  isFavorited: initialIsFavorited,
}) => {
  const { user, loginWithRedirect } = useAuth0();
  const [isFavorited, setIsFavorited] = useState(initialIsFavorited);
  const { addFavorite, removeFavorite } = useFavorite();

  useEffect(() => {
    setIsFavorited(initialIsFavorited);
  }, [initialIsFavorited]);

  const handleFavoriteClick = () => {
    if (!user) {
      loginWithRedirect();
      return;
    }
    if (isFavorited) {
      removeFavorite({ variables: { bookId: book.id } });
    } else {
      addFavorite({ variables: { bookId: book.id } });
    }
    setIsFavorited(!isFavorited);
  };

  return (
    <Grid item xs={6} sm={4} md={4} lg={3} xl={2} key={book.title}>
      <Box position="relative">
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
      </Box>
      <CardWrapper>
        <CardActionAreaWrapper>
          <Cover
            component="img"
            image={book.image || faker.image.url({ width: 150, height: 150 })}
            aria-label={book.title}
          />
          <InfoWrapper>
            <TextWrapper>
              <Typography
                variant="subtitle2"
                fontWeight={700}
                textOverflow="ellipsis"
                overflow="hidden"
                whiteSpace="nowrap"
              >
                {book.title}
              </Typography>
              <Typography
                variant="subtitle2"
                color="textSecondary"
                fontStyle="italic"
                textOverflow="ellipsis"
                overflow="hidden"
                whiteSpace="nowrap"
              >
                {book.author}
              </Typography>
              <Typography
                variant="caption"
                color="textSecondary"
                textOverflow="ellipsis"
                overflow="hidden"
                whiteSpace="nowrap"
              >
                {getYear(book.publicationDate)}
              </Typography>
            </TextWrapper>
            <CircularProgressWithLabel value={book.rating} />
          </InfoWrapper>
        </CardActionAreaWrapper>
      </CardWrapper>
    </Grid>
  );
};
