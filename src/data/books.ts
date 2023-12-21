import { gql } from "@apollo/client";

export type Book = {
  id: string;
  title: string;
  author: string;
  publicationDate: string;
  image: string;
  rating: number;
  ratingsCount: number;
};

export const BOOKS_QUERY = gql`
  query GetBooks($title: String, $cursor: String, $limit: Int) {
    books(title: $title, cursor: $cursor, limit: $limit) {
      cursor
      books {
        id
        title
        author
        publicationDate
        image
        rating
        ratingsCount
      }
    }
  }
`;
