import { ApolloProvider } from "@apollo/client";
import { client } from "./apolloClient";
import { Booklist } from "./components/";

const App = () => (
  <ApolloProvider client={client}>
    <Booklist />
  </ApolloProvider>
);

export default App;
