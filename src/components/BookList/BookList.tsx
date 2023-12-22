import {
  ChangeEvent,
  Dispatch,
  useState,
  useEffect,
  SetStateAction,
} from "react";
import { Box, Grid } from "@mui/material";
import { Root, StyledTextField } from "./BookList.styles";
import { Books } from "./components";

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
        <Grid item xs={10} md={8}>
          <StyledTextField
            label="Search by title or author"
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
      <Books search={debouncedSearch} limit={50} />
    </Root>
  );
};
