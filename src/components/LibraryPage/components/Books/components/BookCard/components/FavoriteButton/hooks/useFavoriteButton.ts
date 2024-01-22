import { gql, useApolloClient } from "@apollo/client";
import { useEffect, useCallback } from "react";
import { useAuth0 } from "@auth0/auth0-react";

import { useFavorite } from "./useFavorite";

export const useFavoriteButton = (
  bookId: string,
  initialIsFavorited: boolean
) => {
  const client = useApolloClient();
  const { user, loginWithRedirect } = useAuth0();
  const { addFavorite, removeFavorite } = useFavorite();

  useEffect(() => {
    client.writeFragment({
      id: `Book:${bookId}`,
      fragment: gql`
        fragment Favorite on Book {
          isFavorited
        }
      `,
      data: {
        isFavorited: initialIsFavorited,
      },
    });
  }, [client, bookId, initialIsFavorited]);

  const getIsFavorited = useCallback(() => {
    const data = client.readFragment({
      id: `Book:${bookId}`,
      fragment: gql`
        fragment Favorite on Book {
          isFavorited
        }
      `,
    });

    return data?.isFavorited;
  }, [client, bookId]);

  const handleFavoriteClick = useCallback(async () => {
    if (!user) {
      loginWithRedirect();
      return;
    }

    const isFavorited = getIsFavorited();
    const action = isFavorited ? removeFavorite : addFavorite;
    await action({ variables: { bookId } });
  }, [
    user,
    getIsFavorited,
    loginWithRedirect,
    bookId,
    addFavorite,
    removeFavorite,
  ]);

  const isFavorited = getIsFavorited();

  return { isFavorited, handleFavoriteClick };
};
