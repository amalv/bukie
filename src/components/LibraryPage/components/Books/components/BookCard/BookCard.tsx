import { Box, Grid } from "@mui/material";

import { Book } from "../../../../../../data/books";

import { FavoriteButton, CardContent } from "./components";

interface BookCardProps {
  book: Book;
}

export const BookCard: React.FC<BookCardProps> = ({ book }) => (
  <Grid item xs={6} sm={4} md={4} lg={3} xl={2} key={book.title}>
    <Box position="relative">
      <FavoriteButton bookId={book.id} isFavorited={book.isFavorited} />
    </Box>
    <CardContent book={book} />
  </Grid>
);
