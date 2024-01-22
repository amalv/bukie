import { InMemoryCache, useApolloClient } from "@apollo/client";
import { renderHook, act } from "@testing-library/react";
import { MockedProvider } from "@apollo/client/testing";
import { useAuth0 } from "@auth0/auth0-react";
import { ReactNode } from "react";
import { vi } from "vitest";

import { useFavorite } from "./useFavorite";
import { useFavoriteButton } from "./useFavoriteButton";

vi.mock("@auth0/auth0-react");
vi.mock("./useFavorite");
vi.mock("@apollo/client");

describe("useFavoriteButton", () => {
  it("handles favorite click when user is logged in", async () => {
    const bookId = "abc123";
    const initialIsFavorited = false;
    const cache = new InMemoryCache();

    const addFavorite = vi.fn();
    const removeFavorite = vi.fn();

    (useAuth0 as jest.Mock).mockReturnValue({
      user: { name: "Test User" },
      loginWithRedirect: vi.fn(),
    });
    (useFavorite as jest.Mock).mockReturnValue({ addFavorite, removeFavorite });

    const isFavoritedState = { isFavorited: initialIsFavorited };
    const writeFragmentMock = vi.fn((args) => {
      isFavoritedState.isFavorited = args.data.isFavorited;
    });
    const readFragmentMock = vi.fn().mockReturnValue(isFavoritedState);

    (useApolloClient as jest.Mock).mockReturnValue({
      readFragment: readFragmentMock,
      writeFragment: writeFragmentMock,
    });

    const wrapper = ({ children }: { children: ReactNode }) => (
      <MockedProvider cache={cache}>{children}</MockedProvider>
    );

    const { result } = renderHook(
      () => useFavoriteButton(bookId, initialIsFavorited),
      { wrapper }
    );

    act(() => {
      result.current.handleFavoriteClick();
    });

    expect(addFavorite).toHaveBeenCalledWith({ variables: { bookId } });
  });
});
