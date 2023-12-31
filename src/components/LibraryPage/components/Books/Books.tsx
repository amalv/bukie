import { Grid } from "@mui/material";
import { ErrorView, LoadingView, BooksView } from "./components";
import { useBooks } from "./hooks";

export interface BooksProps {
  search: string;
  limit: number;
}

export const Books = ({ search, limit }: BooksProps) => {
  const {
    isBookFavorited,
    isErrorSnackbarOpen,
    loading,
    favoritesLoading,
    error,
    data,
    loader,
    handleCloseSnackbar,
  } = useBooks({ search, limit });

  const books =
    data?.books?.books.map((book) => ({
      ...book,
      isFavorited: isBookFavorited(book.id),
    })) ?? [];

  if (loading || favoritesLoading) {
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
        <BooksView books={books} />
      )}
      <div ref={loader} />
    </Grid>
  );
};
