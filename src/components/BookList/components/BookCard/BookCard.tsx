import { Grid, Typography } from "@mui/material";
import { faker } from "@faker-js/faker";
import {
  CardWrapper,
  InfoWrapper,
  Cover,
  TextWrapper,
  CardActionAreaWrapper,
} from "./BookCard.styles";
import { CircularProgressWithLabel } from "./components";
import { Book } from "../../../../data/books";

const getYear = (dateString: string): string => {
  const date = new Date(dateString);
  return date.getFullYear().toString();
};

interface BookCardProps {
  book: Book;
}

export const BookCard: React.FC<BookCardProps> = ({ book }) => (
  <Grid item xs={12} sm={6} md={2} key={book.title}>
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
