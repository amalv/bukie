import { Box, CircularProgress } from "@mui/material";

export const LoadingView = () => (
  <Box
    display="flex"
    justifyContent="center"
    alignItems="center"
    width="100%"
    marginTop={2}
  >
    <CircularProgress />
  </Box>
);
