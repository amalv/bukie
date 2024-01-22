import { useAuth0 } from "@auth0/auth0-react";
import { InMemoryCache, useMutation, gql } from "@apollo/client";
import { renderHook, act } from "@testing-library/react";
import { MockedProvider } from "@apollo/client/testing";
import { ReactNode } from "react";
import { vi } from "vitest";

import { useAddFavorite } from "./useAddFavorite";

vi.mock("@apollo/client");
vi.mock("@auth0/auth0-react", () => ({
  useAuth0: vi.fn(),
}));
vi.mock("@/data/favorites", () => ({
  ADD_FAVORITE_MUTATION: {},
}));

describe("useAddFavorite", () => {
  const bookId = "abc123";
  const cache = new InMemoryCache();
  const addFavoriteMock = vi.fn();

  const wrapper = ({ children }: { children: ReactNode }) => (
    <MockedProvider cache={cache}>{children}</MockedProvider>
  );

  it("handles defined user", () => {
    // Make useAuth0 return a defined user
    (useAuth0 as jest.Mock).mockReturnValue({
      user: { sub: "user-id" },
    });

    // Mock useMutation
    (useMutation as jest.Mock).mockReturnValue([
      addFavoriteMock,
      { loading: false, error: undefined, data: undefined },
    ]);

    const { result } = renderHook(() => useAddFavorite(), { wrapper });

    act(() => {
      result.current.addFavorite({ variables: { bookId } });
    });

    // Check that the mutation was called with the correct variables
    expect(addFavoriteMock).toHaveBeenCalledWith({
      variables: { bookId },
    });
  });

  it("handles undefined user", () => {
    // Make useAuth0 return an undefined user
    (useAuth0 as jest.Mock).mockReturnValue({});

    // Mock useMutation
    (useMutation as jest.Mock).mockReturnValue([
      addFavoriteMock,
      { loading: false, error: undefined, data: undefined },
    ]);

    const { result } = renderHook(() => useAddFavorite(), { wrapper });

    act(() => {
      result.current.addFavorite({ variables: { bookId } });
    });

    // Check that the mutation was called with the correct variables
    expect(addFavoriteMock).toHaveBeenCalledWith({
      variables: { bookId },
    });
  });

  it("updates cache after adding favorite", async () => {
    const cache = new InMemoryCache();
    const writeFragmentSpy = vi.spyOn(cache, "writeFragment");

    let updateFunction: (
      cache: InMemoryCache,
      result: { data: { addFavorite: { book: { id: string } } } }
    ) => void;

    // Define the fragment
    const fragment = gql`
      fragment Favorite on Book {
        isFavorited
      }
    `;

    (useMutation as jest.Mock).mockImplementation((_, { update }) => {
      updateFunction = update;
      return [
        addFavoriteMock,
        {
          loading: false,
          error: undefined,
          data: { addFavorite: { book: { id: bookId } } },
        },
      ];
    });

    const { result } = renderHook(() => useAddFavorite(), { wrapper });

    act(() => {
      result.current.addFavorite({ variables: { bookId } });
    });

    // Simulate the behavior of Apollo Client when a mutation is completed
    act(() => {
      updateFunction(cache, {
        data: { addFavorite: { book: { id: bookId } } },
      });
    });

    // Check that the cache was updated with the correct data
    expect(writeFragmentSpy).toHaveBeenCalledWith({
      id: `Book:${bookId}`,
      fragment: fragment, // Pass the fragment to writeFragment
      data: {
        isFavorited: true,
      },
    });
  });

  it("adds favorite when called", async () => {
    (useMutation as jest.Mock).mockImplementation(() => {
      return [
        addFavoriteMock,
        { loading: false, error: undefined, data: undefined },
      ];
    });
    const { result } = renderHook(() => useAddFavorite(), { wrapper });

    act(() => {
      result.current.addFavorite({ variables: { bookId } });
    });

    // Check that the mutation was called with the correct variables
    expect(addFavoriteMock).toHaveBeenCalledWith({
      variables: { bookId },
    });
    // Check that the mutation did not result in an error
    expect(result.current.addError).toBeUndefined();
  });

  it("handles loading state", () => {
    const mutationResult = { loading: true, error: undefined, data: undefined };
    (useMutation as jest.Mock).mockReturnValue([
      addFavoriteMock,
      mutationResult,
    ]);

    const { result } = renderHook(() => useAddFavorite(), { wrapper });

    expect(result.current.addLoading).toBe(true);
  });

  it("handles error state", () => {
    const mutationResult = {
      loading: false,
      error: new Error("Mutation error"),
      data: undefined,
    };
    (useMutation as jest.Mock).mockReturnValue([
      addFavoriteMock,
      mutationResult,
    ]);

    const { result } = renderHook(() => useAddFavorite(), { wrapper });

    expect(result.current.addError).toEqual(new Error("Mutation error"));
  });
});
