import { ApolloClient, InMemoryCache } from "@apollo/client";

const isProduction = process.env.NODE_ENV === "production";
const API_URL = isProduction
  ? "https://fhdqwwo1yj.execute-api.us-east-1.amazonaws.com/"
  : "http://localhost:3000";

export const client = new ApolloClient({
  uri: API_URL,
  cache: new InMemoryCache(),
});
