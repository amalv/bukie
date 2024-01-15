import { renderHook, act } from "@testing-library/react";
import { vi } from "vitest";

import { useFavorite } from "../useFavorite";

import { useFavoriteButton } from "./useFavoriteButton";

vi.mock("@auth0/auth0-react", () => ({
  useAuth0: vi.fn().mockReturnValue({
    user: { name: "Test User" },
    loginWithRedirect: vi.fn(),
  }),
}));

vi.mock("../useFavorite", () => ({
  useFavorite: vi.fn().mockReturnValue({
    addFavorite: vi.fn(),
    removeFavorite: vi.fn(),
  }),
}));

describe("useFavoriteButton", () => {
  it("handles favorite click when user is logged in", () => {
    const bookId = "1";
    const initialIsFavorited = false;
    const { result } = renderHook(() =>
      useFavoriteButton(bookId, initialIsFavorited)
    );

    act(() => {
      result.current.handleFavoriteClick();
    });

    expect(useFavorite().addFavorite).toHaveBeenCalledWith({
      variables: { bookId },
    });
    expect(result.current.isFavorited).toBe(true);
  });
});
