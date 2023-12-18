import {
  ChangeEvent,
  Dispatch,
  useState,
  useEffect,
  SetStateAction,
} from "react";
import { useQuery } from "@apollo/client";
import { Box, Grid } from "@mui/material";
import { BOOKS_QUERY, Book } from "../../data/books";
import { Root, StyledTextField } from "./BookList.styles";
import { BookCard } from "./components";

interface BooksProps {
  title: string;
}

interface SearchInputProps {
  search: string;
  setSearch: Dispatch<SetStateAction<string>>;
}

const SearchInput = ({ search, setSearch }: SearchInputProps) => {
  const handleSearchChange = (event: ChangeEvent<HTMLInputElement>) => {
    setSearch(event.target.value);
  };

  return (
    <Box
      py={2}
      sx={{
        display: "flex",
        justifyContent: "center",
        width: "100%",
        alignSelf: "center",
      }}
    >
      <Grid container justifyContent="center">
        <Grid item xs={8}>
          <StyledTextField
            label="Search by title"
            variant="outlined"
            onChange={handleSearchChange}
            fullWidth
            value={search}
          />
        </Grid>
      </Grid>
    </Box>
  );
};

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

const Books = ({ title }: BooksProps) => {
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

export const BookList = () => {
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");

  useEffect(() => {
    const timerId = setTimeout(() => {
      setDebouncedSearch(search);
    }, 500);

    return () => {
      clearTimeout(timerId);
    };
  }, [search]);

  return (
    <Root>
      <SearchInput search={search} setSearch={setSearch} />
      <Books title={debouncedSearch} />
    </Root>
  );
};
