import { ApolloProvider } from "@apollo/client";
import { client } from "./apolloClient";
import { BookList } from "./components/";
import { createTheme, ThemeProvider, useMediaQuery } from "@mui/material";

const App = () => {
  const prefersDarkMode = useMediaQuery("(prefers-color-scheme: dark)");

  const theme = createTheme({
    palette: {
      mode: prefersDarkMode ? "dark" : "light",
    },
  });

  return (
    <ApolloProvider client={client}>
      <ThemeProvider theme={theme}>
        <BookList />
      </ThemeProvider>
    </ApolloProvider>
  );
};

export default App;
