import { ApolloProvider } from "@apollo/client";
import { Auth0Provider } from "@auth0/auth0-react";
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

  const isProduction = process.env.NODE_ENV === "production";
  const redirectUri = isProduction
    ? `${window.location.origin}/bukie`
    : window.location.origin;

  return (
    <Auth0Provider
      domain={import.meta.env.VITE_AUTH0_DOMAIN}
      clientId={import.meta.env.VITE_AUTH0_CLIENT_ID}
      authorizationParams={{
        redirect_uri: redirectUri,
      }}
    >
      <ApolloProvider client={client}>
        <ThemeProvider theme={theme}>
          <BookList />
        </ThemeProvider>
      </ApolloProvider>
    </Auth0Provider>
  );
};

export default App;
