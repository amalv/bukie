import { useState, useEffect } from "react";
import {
  Alert,
  Box,
  CircularProgress,
  Grid,
  Snackbar,
  SnackbarCloseReason,
} from "@mui/material";
import { Book } from "../../../../data/books";
import { BookCard } from "./components";
import { useBooks } from "./useBooks";

const SNACKBAR_AUTO_HIDE_DURATION = 6000;

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
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (error) {
      setOpen(true);
    }
  }, [error]);

  const handleClose = (
    _: React.SyntheticEvent | Event,
    reason?: SnackbarCloseReason
  ) => {
    if (reason === "clickaway") {
      return;
    }

    setOpen(false);
  };

  const errorMessage =
    error?.message ||
    error?.networkError?.message ||
    "An unexpected error occurred";
  const books = data?.books?.books || [];

  return (
    <Grid container spacing={2}>
      <Snackbar
        open={open}
        autoHideDuration={SNACKBAR_AUTO_HIDE_DURATION}
        onClose={handleClose}
      >
        <Alert onClose={handleClose} severity="error">
          {errorMessage}
        </Alert>
      </Snackbar>
      {loading ? (
        <Grid
          item
          xs={12}
          container
          justifyContent="center"
          alignItems="center"
          minHeight="200px"
        >
          <CircularProgress />
        </Grid>
      ) : books.length > 0 ? (
        books.map((book: Book) => <BookCard key={book.id} book={book} />)
      ) : (
        <Message text="No books available" />
      )}
      <div ref={loader} />
    </Grid>
  );
};
