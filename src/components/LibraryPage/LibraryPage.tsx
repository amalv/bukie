import { useLibraryPage } from "./hooks";
import { Alert, Box, Grid, Snackbar } from "@mui/material";
import { Root } from "./LibraryPage.styles";
import { Books, Search, ThemeSwitch, UserAuthentication } from "./components";

export const LibraryPage = () => {
  const { search, setSearch, debouncedSearch, error, setError } =
    useLibraryPage();

  return (
    <Root>
      <Snackbar
        aria-live="polite"
        open={!!error}
        autoHideDuration={6000}
        onClose={() => setError(null)}
      >
        <Alert severity="error" onClose={() => setError(null)}>
          {error?.message}
        </Alert>
      </Snackbar>
      <Grid container>
        <Grid item xs={0.5} sm={1} md={2} lg={2} />
        <Grid item xs={11} sm={10} md={8} lg={8}>
          <Box
            display="flex"
            flexDirection="column"
            alignItems="flex-end"
            mt={2}
          >
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
    </Root>
  );
};
