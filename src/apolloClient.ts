import {
  ApolloClient,
  InMemoryCache,
  createHttpLink,
  makeVar,
} from "@apollo/client";
import { setContext } from "@apollo/client/link/context";

export const darkModeVar = makeVar(
  window?.matchMedia("(prefers-color-scheme: dark)")?.matches
);

const apiUrlMap = {
  production: import.meta.env.VITE_API_URL_PRODUCTION,
  staging: import.meta.env.VITE_API_URL_STAGING,
  development: import.meta.env.VITE_API_URL_DEVELOPMENT,
};

const API_URL =
  apiUrlMap[import.meta.env.VITE_ENV as keyof typeof apiUrlMap] ||
  apiUrlMap.development;

const httpLink = createHttpLink({
  uri: API_URL,
});

const authLink = setContext((_, { headers }) => {
  const token = localStorage.getItem("auth0.token");

  return {
    headers: {
      ...headers,
      ...(token ? { authorization: `Bearer ${token}` } : {}),
    },
  };
});

export const client = new ApolloClient({
  link: authLink.concat(httpLink),
  cache: new InMemoryCache({
    typePolicies: {
      Query: {
        fields: {
          darkMode: {
            read() {
              return darkModeVar();
            },
          },
        },
      },
    },
  }),
});
