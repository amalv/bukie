import { ApolloProvider } from "@apollo/client";
import { client } from "./apolloClient";
import { BookList } from "./components/";

const App = () => (
  <ApolloProvider client={client}>
    <BookList />
  </ApolloProvider>
);

export default App;
