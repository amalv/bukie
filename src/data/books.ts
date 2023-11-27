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
  query GetBooks {
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
`;
