import { gql } from "@apollo/client";

export type Book = {
  id: string;
  title: string;
  author: string;
  isFavorited: boolean;
  publicationDate: string;
  image: string;
  rating: number;
  ratingsCount: number;
};
export interface BooksVars {
  author: string;
  title: string;
  cursor: string;
  limit: number;
}

export interface BooksData {
  books: {
    __typename: string;
    cursor: string;
    books: Book[];
  };
}

export const BOOKS_QUERY = gql`
  query GetBooks(
    $author: String
    $title: String
    $cursor: String
    $limit: Int
  ) {
    books(author: $author, title: $title, cursor: $cursor, limit: $limit) {
      cursor
      books {
        id
        title
        author
        isFavorited
        publicationDate
        image
        rating
        ratingsCount
      }
    }
  }
`;
