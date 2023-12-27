import { Grid, Box } from "@mui/material";

export const Message = ({ text }: { text: string }) => (
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
