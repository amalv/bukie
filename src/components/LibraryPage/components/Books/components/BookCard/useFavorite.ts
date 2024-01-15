import { useMutation } from "@apollo/client";

import {
  ADD_FAVORITE_MUTATION,
  REMOVE_FAVORITE_MUTATION,
} from "@/data/favorites";

export const useFavorite = () => {
  const [addFavorite, { data: addData, loading: addLoading, error: addError }] =
    useMutation(ADD_FAVORITE_MUTATION);
  const [removeFavorite, { loading: removeLoading, error: removeError }] =
    useMutation(REMOVE_FAVORITE_MUTATION);

  return {
    addFavorite,
    addData,
    addLoading,
    addError,
    removeFavorite,
    removeLoading,
    removeError,
  };
};
