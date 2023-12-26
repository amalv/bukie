import { ChangeEvent, Dispatch, SetStateAction } from "react";
import { useBookList } from "./useBookList";
import {
  Avatar,
  Box,
  CircularProgress,
  Grid,
  Menu,
  MenuItem,
} from "@mui/material";
import { Root, StyledTextField } from "./BookList.styles";
import { Books } from "./components";
import { LoginButton } from "./components/LoginButton/LoginButton";

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

export const BookList = () => {
  const {
    search,
    setSearch,
    debouncedSearch,
    user,
    anchorEl,
    handleClick,
    handleClose,
    handleLogout,
    userState,
  } = useBookList();

  const userStates = {
    loading: <CircularProgress />,
    authenticated:
      user && user.name ? (
        <div>
          <Avatar onClick={handleClick}>{user?.name[0]}</Avatar>
          <Menu
            anchorEl={anchorEl}
            open={Boolean(anchorEl)}
            onClose={handleClose}
          >
            <MenuItem onClick={handleLogout}>Logout</MenuItem>
          </Menu>
        </div>
      ) : null,
    unauthenticated: <LoginButton />,
  };

  return (
    <Root>
      <Grid container>
        <Grid item xs={1} sm={1} md={2} />
        <Grid item xs={10} sm={10} md={8}>
          <Box display="flex" justifyContent="flex-end" mt={2}>
            {userStates[userState]}
          </Box>
          <SearchInput search={search} setSearch={setSearch} />
          <Books search={debouncedSearch} limit={50} />
        </Grid>
        <Grid item xs={1} sm={1} md={2} />
      </Grid>
    </Root>
  );
};
