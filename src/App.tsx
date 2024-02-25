import { ApolloProvider } from "@apollo/client";
import { Auth0Provider } from "@auth0/auth0-react";
import { ThemeProvider } from "@mui/material";

import { client } from "./apolloClient";
import { LibraryPage } from "./components/";
import { AuthProvider } from "./contexts";
import { useTheme } from "./hooks";
import { getEnvironmentDependentUrl } from "./utils/";

export const App = () => {
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
