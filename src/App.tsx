import { Box } from "@mui/material";
import { ApolloProvider, useReactiveVar } from "@apollo/client";
import { Auth0Provider } from "@auth0/auth0-react";
import { client } from "./apolloClient";
import { LibraryPage } from "./components/";
import { createTheme, ThemeProvider } from "@mui/material";
import { darkModeVar } from "./apolloClient";

const App = () => {
  const darkMode = useReactiveVar(darkModeVar) as boolean;

  const theme = createTheme({
    palette: {
      mode: darkMode ? "dark" : "light",
      primary: {
        light: "#a0522d",
        main: "#a0522d",
        dark: "#6d351a",
        contrastText: "#fff",
      },
      secondary: {
        light: "#556b2f",
        main: "#556b2f",
        dark: "#374b20",
        contrastText: "#fff",
      },
    },
    components: {
      MuiAvatar: {
        styleOverrides: {
          root: {
            backgroundColor: "#a0522d",
            cursor: "pointer",
          },
        },
      },
      MuiListItemButton: {
        styleOverrides: {
          root: {
            cursor: "pointer",
          },
        },
      },
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
      cacheLocation="localstorage"
    >
      <ApolloProvider client={client}>
        <ThemeProvider theme={theme}>
          <Box
            sx={{
              backgroundColor: theme.palette.background.default,
              color: theme.palette.text.primary,
              width: "100%",
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
