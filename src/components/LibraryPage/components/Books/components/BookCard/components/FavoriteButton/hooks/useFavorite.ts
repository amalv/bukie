import { useAddFavorite } from "./useAddFavorite";
import { useRemoveFavorite } from "./useRemoveFavorite";

export const useFavorite = () => {
  const { addFavorite, addData, addLoading, addError } = useAddFavorite();
  const { removeFavorite, removeLoading, removeError } = useRemoveFavorite();

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
