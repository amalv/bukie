import { useQuery } from "@apollo/client";
import { CardActionArea, CardContent, Grid, Typography } from "@mui/material";
import { faker } from "@faker-js/faker";
import { BOOKS_QUERY, Book } from "../../data/books";
import { Root, CardWrapper, Cover } from "./BookList.styles";
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
              <Grid item xs={12} sm={6} md={3} key={book.title}>
                <CardWrapper>
                  <CardActionArea>
                    <Cover
                      component="img"
                      image={
                        book.image ||
                        faker.image.url({ width: 150, height: 150 })
                      }
                      aria-label={book.title}
                    />
                    <CardContent>
                      <Typography
                        gutterBottom
                        variant="h5"
                        component="h2"
                        align="center"
                      >
                        {book.title}
                      </Typography>
                      <Typography
                        variant="body2"
                        color="textSecondary"
                        component="p"
                        align="center"
                      >
                        {book.author} ({getYear(book.publicationDate)})
                      </Typography>
                    </CardContent>
                  </CardActionArea>
                  <CircularProgressWithLabel value={book.rating} />
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
