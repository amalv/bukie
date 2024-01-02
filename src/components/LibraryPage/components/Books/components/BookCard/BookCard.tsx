import { Box, Grid } from "@mui/material";
import { FavoriteButton, CardContent } from "./components";
import { Book } from "../../../../../../data/books";

interface BookCardProps {
  book: Book;
  isFavorited: boolean;
}

export const BookCard: React.FC<BookCardProps> = ({ book, isFavorited }) => (
  <Grid item xs={6} sm={4} md={4} lg={3} xl={2} key={book.title}>
    <Box position="relative">
      <FavoriteButton bookId={book.id} isFavorited={isFavorited} />
    </Box>
    <CardContent book={book} />
  </Grid>
);
