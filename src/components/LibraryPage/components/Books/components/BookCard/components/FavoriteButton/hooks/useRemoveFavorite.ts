import { useMutation } from "@apollo/client";

import { REMOVE_FAVORITE_MUTATION } from "@/data/favorites";

export const useRemoveFavorite = () => {
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
    removeFavorite: removeFavoriteWithVariables,
    removeLoading,
    removeError,
  };
};
