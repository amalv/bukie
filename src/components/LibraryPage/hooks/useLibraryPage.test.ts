import { act, renderHook, waitFor } from "@testing-library/react";

import { useLibraryPage } from "./useLibraryPage";

describe("useLibraryPage", () => {
  it("should update search and debouncedSearch after debounce delay", async () => {
    const { result } = renderHook(() => useLibraryPage(100));

    // Update search
    act(() => {
      result.current.setSearch("Test search");
    });

    expect(result.current.search).toBe("Test search");
    expect(result.current.debouncedSearch).toBe("");

    // Wait for debounce and check debouncedSearch
    await waitFor(() =>
      expect(result.current.debouncedSearch).toBe("Test search"),
    );
  });

  it("should update debouncedSearch once after multiple updates to search", async () => {
    const { result } = renderHook(() => useLibraryPage(100));

    // Update search multiple times
    act(() => {
      result.current.setSearch("Test");
      result.current.setSearch("Test search");
    });

    expect(result.current.search).toBe("Test search");

    // Wait for debounce and check debouncedSearch
    await waitFor(() =>
      expect(result.current.debouncedSearch).toBe("Test search"),
    );
  });

  it("should clear debouncedSearch when search is cleared", async () => {
    const { result } = renderHook(() => useLibraryPage(100));

    // Set and clear search
    act(() => {
      result.current.setSearch("Test search");
      result.current.setSearch("");
    });

    expect(result.current.search).toBe("");

    // Wait for debounce and check debouncedSearch
    await waitFor(() => expect(result.current.debouncedSearch).toBe(""));
  });

  it("should update and clear error", () => {
    const { result } = renderHook(() => useLibraryPage(500));

    // Set and clear error
    const error = new Error("Test error");
    act(() => {
      result.current.setError(error);
      result.current.setError(null);
    });

    expect(result.current.error).toBeNull();
  });
});
