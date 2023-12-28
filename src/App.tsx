import { ThemeProvider } from "@mui/material";
import { ApolloProvider } from "@apollo/client";
import { Auth0Provider } from "@auth0/auth0-react";
import { client } from "./apolloClient";
import { LibraryPage } from "./components/";
import { useTheme } from "./hooks";

const getRedirectUri = () => {
  const isProduction = process.env.NODE_ENV === "production";
  return isProduction
    ? `${window.location.origin}/bukie`
    : window.location.origin;
};
const App = () => {
  const theme = useTheme();
  const redirectUri = getRedirectUri();

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
          <LibraryPage />
        </ThemeProvider>
      </ApolloProvider>
    </Auth0Provider>
  );
};

export default App;
