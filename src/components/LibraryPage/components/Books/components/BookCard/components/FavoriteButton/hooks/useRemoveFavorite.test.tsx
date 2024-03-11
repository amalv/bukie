import { InMemoryCache, useMutation } from "@apollo/client";
import { MockedProvider } from "@apollo/client/testing";
import { act, renderHook } from "@testing-library/react";
import type { ReactNode } from "react";
import { vi } from "vitest";

import { useRemoveFavorite } from "./useRemoveFavorite";

vi.mock("@apollo/client");
describe("useRemoveFavorite", () => {
  const bookId = "abc123";
  const cache = new InMemoryCache();
  const removeFavoriteMock = vi.fn();

  const wrapper = ({ children }: { children: ReactNode }) => (
    <MockedProvider cache={cache}>{children}</MockedProvider>
  );

  it("removes favorite when called", async () => {
    const mutationResult = { loading: false, error: undefined };
    (useMutation as jest.Mock).mockReturnValue([
      removeFavoriteMock,
      mutationResult,
    ]);
    const wrapper = ({ children }: { children: ReactNode }) => (
      <MockedProvider cache={cache}>{children}</MockedProvider>
    );
    const { result } = renderHook(() => useRemoveFavorite(), { wrapper });

    act(() => {
      result.current.removeFavorite({ variables: { bookId } });
    });

    // Check that the mutation was called with the correct variables
    expect(removeFavoriteMock).toHaveBeenCalledWith({
      variables: { bookId },
      update: expect.any(Function),
    });
    // Check that the mutation did not result in an error
    expect(result.current.removeError).toBeUndefined();
  });

  it("handles loading state", () => {
    const mutationResult = { loading: true, error: undefined };
    (useMutation as jest.Mock).mockReturnValue([
      removeFavoriteMock,
      mutationResult,
    ]);

    const { result } = renderHook(() => useRemoveFavorite(), { wrapper });

    expect(result.current.removeLoading).toBe(true);
  });

  it("handles error state", () => {
    const mutationResult = {
      loading: false,
      error: new Error("Mutation error"),
    };
    (useMutation as jest.Mock).mockReturnValue([
      removeFavoriteMock,
      mutationResult,
    ]);

    const { result } = renderHook(() => useRemoveFavorite(), { wrapper });

    expect(result.current.removeError).toEqual(new Error("Mutation error"));
  });
});
