import { Box, Grid } from "@mui/material";

import { FavoriteButton, CardContent } from "./components";

import { Book } from "@/data/books";

export const BookCard: React.FC<{ book: Book }> = ({ book }) => (
  <Grid item xs={6} sm={4} md={4} lg={3} xl={2} key={book.title}>
    <Box position="relative">
      <FavoriteButton bookId={book.id} isFavorited={book.isFavorited} />
    </Box>
    <CardContent book={book} />
  </Grid>
);
