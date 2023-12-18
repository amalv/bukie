import { ApolloClient, InMemoryCache } from "@apollo/client";

const isProduction = process.env.NODE_ENV === "production";
const API_URL = isProduction
  ? import.meta.env.VITE_API_URL_PRODUCTION
  : import.meta.env.VITE_API_URL_DEVELOPMENT;

export const client = new ApolloClient({
  uri: API_URL,
  cache: new InMemoryCache(),
});
