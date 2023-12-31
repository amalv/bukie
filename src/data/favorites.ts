import { gql } from "@apollo/client";

interface Favorite {
  book: {
    id: string;
    title: string;
  };
}

interface User {
  id: string;
  auth0Id: string;
  favorites: Favorite[];
}

export interface FavoritesData {
  user: User;
}

export const GET_FAVORITES_QUERY = gql`
  query {
    user {
      id
      auth0Id
      favorites {
        book {
          id
          title
        }
      }
    }
  }
`;

export const ADD_FAVORITE_MUTATION = gql`
  mutation AddFavorite($bookId: ID!) {
    addFavorite(bookId: $bookId) {
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

export const REMOVE_FAVORITE_MUTATION = gql`
  mutation RemoveFavorite($bookId: ID!) {
    removeFavorite(bookId: $bookId)
  }
`;
