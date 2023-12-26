import { renderHook, act } from "@testing-library/react";
import { useQuery } from "@apollo/client";
import { useBooks } from "./useBooks";
import { useIntersectionObserver } from "./useIntersectionObserver";
import { vi } from "vitest";

vi.mock("@apollo/client", async () => {
  const actual = await vi.importActual("@apollo/client");
  return {
    ...actual,
    useQuery: vi.fn(),
  };
});

vi.mock("./useIntersectionObserver", () => ({
  useIntersectionObserver: vi.fn(),
}));

global.IntersectionObserver = class IntersectionObserver {
  root = null;
  rootMargin = "";
  thresholds = [0];
  constructor() {}
  observe() {
    return null;
  }
  disconnect() {
    return null;
  }
  unobserve() {
    return null;
  }
  takeRecords() {
    return [];
  }
};

describe("useBooks", () => {
  it("fetches books and handles pagination", async () => {
    const mockFetchMore = vi.fn().mockResolvedValue({});
    const mockData = { books: { cursor: "1", books: [] } };
    (useQuery as jest.Mock).mockReturnValue({
      loading: false,
      error: null,
      data: mockData,
      fetchMore: mockFetchMore,
    });

    const { result } = renderHook(() =>
      useBooks({ search: "test", limit: 10 })
    );

    // Check that the data is returned correctly
    expect(result.current.data).toEqual(mockData);

    // Simulate the loader becoming visible
    act(() => {
      const handleFetchMore = (useIntersectionObserver as jest.Mock).mock
        .calls[0][1];
      handleFetchMore(new IntersectionObserver(() => {}));
    });

    // Check that fetchMore was called with the correct cursor
    expect(mockFetchMore).toHaveBeenCalledWith({
      variables: { cursor: "1" },
      updateQuery: expect.any(Function),
    });
  });
});
