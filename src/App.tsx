import { Box, ThemeProvider } from "@mui/material";
import { ApolloProvider } from "@apollo/client";
import { Auth0Provider } from "@auth0/auth0-react";
import { client } from "./apolloClient";
import { LibraryPage } from "./components/";
import { useTheme } from "./hooks";

const App = () => {
  const theme = useTheme();
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
      cacheLocation="localstorage"
    >
      <ApolloProvider client={client}>
        <ThemeProvider theme={theme}>
          <Box
            sx={{
              backgroundColor: theme.palette.background.default,
              color: theme.palette.text.primary,
              width: "100%",
              minHeight: "100vh",
              margin: 0,
            }}
          >
            <LibraryPage />
          </Box>
        </ThemeProvider>
      </ApolloProvider>
    </Auth0Provider>
  );
};

export default App;
