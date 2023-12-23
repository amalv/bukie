import { Box, Grid } from "@mui/material";
import { Book } from "../../../../data/books";
import { BookCard } from "./components";
import { useBooks } from "./useBooks";

export interface BooksProps {
  search: string;
  limit: number;
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

export const Books = ({ search, limit }: BooksProps) => {
  const { loading, error, data, loader } = useBooks({ search, limit });

  if (error) {
    console.error("Failed to fetch books:", error);
    return <p>Error occurred while fetching books.</p>;
  }

  const books = data?.books?.books || [];

  return (
    <Grid container spacing={2}>
      {loading ? (
        <Message text="Loading..." />
      ) : books.length > 0 ? (
        books.map((book: Book) => <BookCard key={book.title} book={book} />)
      ) : (
        <Message text="No books available" />
      )}
      <div ref={loader} />
    </Grid>
  );
};
