// components/BookList/components/Books/Books.tsx

import { useQuery } from "@apollo/client";
import { Box, Grid } from "@mui/material";
import { BOOKS_QUERY, Book } from "../../../../data/books";
import { BookCard } from "./components";

interface BooksProps {
  title: string;
}

const Message = ({ text }: { text: string }) => (
  <Grid item xs={12}>
    <Box
      display="flex"
      height="100%"
      justifyContent="center"
      alignItems="center"
    >
      <p>{text}</p>
    </Box>
  </Grid>
);

export const Books = ({ title }: BooksProps) => {
  const { loading, error, data } = useQuery(BOOKS_QUERY, {
    variables: { title },
  });

  if (error) {
    console.error("Failed to fetch books:", error);
    return <p>Error occurred while fetching books.</p>;
  }

  return (
    <Grid container spacing={2}>
      <Grid item xs={1} sm={1} md={2} />
      <Grid item xs={10} sm={10} md={8}>
        <Grid container spacing={2}>
          {loading ? (
            <Message text="Loading..." />
          ) : data.books.length > 0 ? (
            data.books.map((book: Book) => (
              <BookCard key={book.title} book={book} />
            ))
          ) : (
            <Message text="No books available" />
          )}
        </Grid>
      </Grid>
    </Grid>
  );
};
