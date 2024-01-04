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

  if (loading) {
    return <LoadingView />;
  }

  return (
    <Grid container spacing={2}>
      {error ? (
        <ErrorView
          error={error}
          isErrorSnackbarOpen={isErrorSnackbarOpen}
          handleCloseSnackbar={handleCloseSnackbar}
        />
      ) : (
        <BooksView books={data?.books.books || []} />
      )}
      <div ref={loader} />
    </Grid>
  );
};
