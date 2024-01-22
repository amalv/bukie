import { InMemoryCache, useMutation } from "@apollo/client";
import { renderHook, act } from "@testing-library/react";
import { MockedProvider } from "@apollo/client/testing";
import { ReactNode } from "react";
import { vi } from "vitest";

import { useAddFavorite } from "./useAddFavorite";

vi.mock("@apollo/client");
describe("useAddFavorite", () => {
  const bookId = "abc123";
  const cache = new InMemoryCache();
  const addFavoriteMock = vi.fn();

  const wrapper = ({ children }: { children: ReactNode }) => (
    <MockedProvider cache={cache}>{children}</MockedProvider>
  );

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
