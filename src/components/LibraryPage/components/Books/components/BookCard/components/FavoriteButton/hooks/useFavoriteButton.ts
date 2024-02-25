import { gql, useApolloClient } from "@apollo/client";
import { useAuth0 } from "@auth0/auth0-react";
import { useCallback, useEffect } from "react";

import { useFavorite } from "./useFavorite";

const FAVORITE_FRAGMENT = gql`
  fragment Favorite on Book {
    isFavorited
  }
`;

export const useFavoriteButton = (
  bookId: string,
  initialIsFavorited: boolean,
) => {
  const client = useApolloClient();
  const { user, loginWithRedirect } = useAuth0();
  const { addFavorite, removeFavorite } = useFavorite();

  useEffect(() => {
    client.writeFragment({
      id: `Book:${bookId}`,
      fragment: FAVORITE_FRAGMENT,
      data: { isFavorited: initialIsFavorited },
    });
  }, [client, bookId, initialIsFavorited]);

  const getIsFavorited = useCallback(() => {
    const data = client.readFragment({
      id: `Book:${bookId}`,
      fragment: FAVORITE_FRAGMENT,
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

  return { isFavorited: getIsFavorited(), handleFavoriteClick };
};
