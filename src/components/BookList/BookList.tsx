import { useAuth0 } from "@auth0/auth0-react";
import {
  ChangeEvent,
  Dispatch,
  useState,
  useEffect,
  SetStateAction,
} from "react";
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
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const { user, logout, isLoading } = useAuth0();
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);

  useEffect(() => {
    if (user) {
      console.log(user.sub); // user ID
    }
  }, [user]);

  useEffect(() => {
    const timerId = setTimeout(() => {
      setDebouncedSearch(search);
    }, 500);

    return () => {
      clearTimeout(timerId);
    };
  }, [search]);

  const handleClick = (event: React.MouseEvent<HTMLDivElement>) => {
    setAnchorEl(event.currentTarget);
  };

  const handleClose = () => {
    setAnchorEl(null);
  };

  const handleLogout = () => {
    logout();
  };

  return (
    <Root>
      <Grid container>
        <Grid item xs={1} sm={1} md={2} />
        <Grid item xs={10} sm={10} md={8}>
          <Box display="flex" justifyContent="flex-end" mt={2}>
            {isLoading ? (
              <CircularProgress />
            ) : user && user.name ? (
              <div>
                <Avatar onClick={handleClick}>{user.name[0]}</Avatar>
                <Menu
                  anchorEl={anchorEl}
                  open={Boolean(anchorEl)}
                  onClose={handleClose}
                >
                  <MenuItem onClick={handleLogout}>Logout</MenuItem>
                </Menu>
              </div>
            ) : (
              <LoginButton />
            )}
          </Box>
          <SearchInput search={search} setSearch={setSearch} />
          <Books search={debouncedSearch} limit={50} />
        </Grid>
        <Grid item xs={1} sm={1} md={2} />
      </Grid>
    </Root>
  );
};
