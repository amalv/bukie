import { ThemeProvider } from "@mui/material";
import { Auth0Provider } from "@auth0/auth0-react";
import { LibraryPage } from "./components/";
import { useTheme } from "./hooks";
import { AuthProvider } from "./contexts";
import { ApolloProvider } from "@apollo/client";
import { client } from "./apolloClient";
import { getEnvironmentDependentUrl } from "./utils/";

const App = () => {
  const theme = useTheme();
  const redirectUri = getEnvironmentDependentUrl();

  return (
    <Auth0Provider
      domain={import.meta.env.VITE_AUTH0_DOMAIN}
      clientId={import.meta.env.VITE_AUTH0_CLIENT_ID}
      authorizationParams={{
        audience: "bukie",
        scope: "openid profile email",
        redirect_uri: redirectUri,
      }}
      cacheLocation="localstorage"
    >
      <AuthProvider>
        <ApolloProvider client={client}>
          <ThemeProvider theme={theme}>
            <LibraryPage />
          </ThemeProvider>
        </ApolloProvider>
      </AuthProvider>
    </Auth0Provider>
  );
};

export default App;
