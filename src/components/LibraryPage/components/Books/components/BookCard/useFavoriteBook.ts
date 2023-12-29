import { useMutation, gql } from "@apollo/client";

const FAVORITE_BOOK_MUTATION = gql`
  mutation FavoriteBook($bookId: ID!) {
    favoriteBook(bookId: $bookId) {
      id
      user {
        id
      }
      book {
        id
      }
    }
  }
`;

export const useFavoriteBook = () => {
  const [favoriteBook, { data, loading, error }] = useMutation(
    FAVORITE_BOOK_MUTATION
  );

  return {
    favoriteBook,
    data,
    loading,
    error,
  };
};
