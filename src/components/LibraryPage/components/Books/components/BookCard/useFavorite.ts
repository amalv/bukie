import { useAuth0 } from "@auth0/auth0-react";
import { useMutation, gql } from "@apollo/client";

import {
  ADD_FAVORITE_MUTATION,
  REMOVE_FAVORITE_MUTATION,
} from "@/data/favorites";

export const useFavorite = () => {
  const { user } = useAuth0();

  const [addFavorite, { data: addData, loading: addLoading, error: addError }] =
    useMutation(ADD_FAVORITE_MUTATION, {
      optimisticResponse: {
        __typename: "Mutation",
        addFavorite: {
          __typename: "Favorite",
          id: Math.random().toString(), // Generate a temporary id
          user: {
            __typename: "User",
            id: user?.sub, // Use the user's id from Auth0
          },
          book: {
            __typename: "Book",
            id: "", // This will be filled in when the mutation is called
          },
        },
      },
      update(cache, { data: { addFavorite } }) {
        cache.writeFragment({
          id: `Book:${addFavorite.book.id}`,
          fragment: gql`
            fragment Favorite on Book {
              isFavorited
            }
          `,
          data: {
            isFavorited: true,
          },
        });
      },
    });

  const [removeFavorite, { loading: removeLoading, error: removeError }] =
    useMutation(REMOVE_FAVORITE_MUTATION, {
      optimisticResponse: {
        __typename: "Mutation",
        removeFavorite: true,
      },
    });

  const removeFavoriteWithVariables = async ({
    variables: { bookId },
  }: {
    variables: { bookId: string };
  }) => {
    await removeFavorite({
      variables: { bookId },
      update(cache) {
        cache.modify({
          id: `Book:${bookId}`,
          fields: {
            isFavorited() {
              return false;
            },
          },
        });
      },
    });
  };

  return {
    addFavorite,
    addData,
    addLoading,
    addError,
    removeFavorite: removeFavoriteWithVariables,
    removeLoading,
    removeError,
  };
};
