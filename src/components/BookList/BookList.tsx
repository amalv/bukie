import { useQuery } from "@apollo/client";
import { Grid, Typography } from "@mui/material";
import { faker } from "@faker-js/faker";
import { BOOKS_QUERY, Book } from "../../data/books";
import {
  Root,
  CardWrapper,
  InfoWrapper,
  Cover,
  TextWrapper,
  CardActionAreaWrapper,
} from "./BookList.styles";
import { CircularProgressWithLabel } from "./components";

const getYear = (dateString: string): string => {
  const date = new Date(dateString);
  return date.getFullYear().toString();
};

const BookList = () => {
  const { loading, error, data } = useQuery(BOOKS_QUERY);

  if (loading) return null;
  if (error) {
    console.error("Failed to fetch books:", error);
    return null;
  }

  return (
    <Root>
      <Grid container spacing={2}>
        <Grid item xs={1} sm={1} md={2} />
        <Grid item xs={10} sm={10} md={8}>
          <Grid container spacing={2}>
            {data.books.map((book: Book) => (
              <Grid item xs={12} sm={6} md={2} key={book.title}>
                <CardWrapper>
                  <CardActionAreaWrapper>
                    <Cover
                      component="img"
                      image={
                        book.image ||
                        faker.image.url({ width: 150, height: 150 })
                      }
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
            ))}
          </Grid>
        </Grid>
        <Grid item xs={1} sm={1} md={2} />
      </Grid>
    </Root>
  );
};

export default BookList;
