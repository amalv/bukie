import { useLibraryPage } from "./hooks";
import { Box, Grid } from "@mui/material";
import { Root } from "./LibraryPage.styles";
import { Books, Search, ThemeSwitch, UserAuthentication } from "./components";
import { ErrorSnackbar } from "../shared";

interface LibraryGridProps {
  search: string;
  setSearch: React.Dispatch<React.SetStateAction<string>>;
  debouncedSearch: string;
}

const LibraryGrid: React.FC<LibraryGridProps> = ({
  search,
  setSearch,
  debouncedSearch,
}) => (
  <Grid container>
    <Grid item xs={0.5} sm={1} md={2} lg={2} />
    <Grid item xs={11} sm={10} md={8} lg={8}>
      <Box display="flex" flexDirection="column" alignItems="flex-end" mt={2}>
        <ThemeSwitch />
        <Box mt={2}>
          <UserAuthentication />
        </Box>
      </Box>
      <Search search={search} setSearch={setSearch} />
      <Books search={debouncedSearch} limit={50} />
    </Grid>
    <Grid item xs={0.5} sm={1} md={2} lg={2} />
  </Grid>
);

export const LibraryPage = () => {
  const { search, setSearch, debouncedSearch, error, setError } =
    useLibraryPage();

  return (
    <Root>
      <ErrorSnackbar
        open={Boolean(error)}
        handleClose={() => setError(null)}
        errorMessage={error?.message ?? ""}
      />
      <LibraryGrid
        search={search}
        setSearch={setSearch}
        debouncedSearch={debouncedSearch}
      />
    </Root>
  );
};
