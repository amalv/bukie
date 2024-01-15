import { ChangeEvent, Dispatch, SetStateAction } from "react";
import { Box } from "@mui/material";

import { StyledTextField } from "./SearchInput.styles";

interface SearchProps {
  search: string;
  setSearch: Dispatch<SetStateAction<string>>;
}

export const Search = ({ search, setSearch }: SearchProps) => {
  const handleSearchChange = (event: ChangeEvent<HTMLInputElement>) => {
    setSearch(event.target.value);
  };

  return (
    <Box
      py={2}
      display="flex"
      justifyContent="center"
      width="100%"
      alignSelf="center"
    >
      <StyledTextField
        label="Search by title or author"
        variant="outlined"
        onChange={handleSearchChange}
        fullWidth
        value={search}
      />
    </Box>
  );
};
