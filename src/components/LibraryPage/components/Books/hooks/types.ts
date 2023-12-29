import { Book } from "../../../../../data/books";

export interface FetchMoreResult {
  books: {
    __typename: string;
    cursor: string;
    books: Book[];
  };
}
