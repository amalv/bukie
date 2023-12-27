import { Grid } from "@mui/material";
import { ErrorView, LoadingView, BooksView } from "./components";
import { useBooks } from "./hooks";

export interface BooksProps {
  search: string;
  limit: number;
}

export const Books = ({ search, limit }: BooksProps) => {
  const {
    isErrorSnackbarOpen,
    loading,
    error,
    data,
    loader,
    handleCloseSnackbar,
  } = useBooks({ search, limit });

  const books = data?.books?.books || [];

  return (
    <Grid container spacing={2}>
      {error ? (
        <ErrorView
          error={error}
          isErrorSnackbarOpen={isErrorSnackbarOpen}
          handleCloseSnackbar={handleCloseSnackbar}
        />
      ) : loading ? (
        <LoadingView />
      ) : (
        <BooksView books={books} />
      )}
      <div ref={loader} />
    </Grid>
  );
};
