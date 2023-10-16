import { CardActionArea, CardContent, Grid, Typography } from "@mui/material";
import { Book, books } from "../../data/books";
import { Root, CardWrapper, Cover } from "./BookList.styles";
import { CircularProgressWithLabel } from "./components";

const BookList = () => (
  <Root>
    <Grid container spacing={2} maxWidth='100%' mx='auto'>
      {books.map((book: Book) => (
        <Grid item xs={12} sm={6} md={4} key={book.title}>
          <CardWrapper>
            <CardActionArea>
              <Cover component='img' image={book.image} aria-label={book.title} />
              <CardContent>
                <Typography gutterBottom variant='h5' component='h2' align='center'>
                  {book.title}
                </Typography>
                <Typography variant='body2' color='textSecondary' component='p' align='center'>
                  {book.author} ({book.year})
                </Typography>
              </CardContent>
            </CardActionArea>
            <CircularProgressWithLabel value={book.rating} />
          </CardWrapper>
        </Grid>
      ))}
    </Grid>
  </Root>
);

export default BookList;
