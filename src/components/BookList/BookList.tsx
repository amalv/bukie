import { ChangeEvent, useState } from "react";
import { useQuery } from "@apollo/client";
import { Box, Grid } from "@mui/material";
import { BOOKS_QUERY, Book } from "../../data/books";
import { Root, StyledTextField } from "./BookList.styles";
import { BookCard } from "./components";

export const BookList = () => {
  const { loading, error, data } = useQuery(BOOKS_QUERY);
  const [search, setSearch] = useState("");

  const handleSearchChange = (event: ChangeEvent<HTMLInputElement>) => {
    setSearch(event.target.value);
  };

  if (loading) return null;

  if (error) {
    console.error("Failed to fetch books:", error);
    return null;
  }

  return (
    <Root>
      <Grid container spacing={2}>
        <Grid item xs={1} sm={1} md={2} />
        <Grid item xs={10} sm={10} md={8}>
          <Box py={2}>
            <StyledTextField
              label="Search by title"
              variant="outlined"
              value={search}
              onChange={handleSearchChange}
              fullWidth
            />
          </Box>
        </Grid>
      </Grid>
      <Grid container spacing={2}>
        <Grid item xs={1} sm={1} md={2} />
        <Grid item xs={10} sm={10} md={8}>
          <Grid container spacing={2}>
            {data.books.map((book: Book) => (
              <BookCard key={book.title} book={book} />
            ))}
          </Grid>
        </Grid>
      </Grid>
    </Root>
  );
};
