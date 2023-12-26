import { renderHook, act } from "@testing-library/react";
import { useDebounce } from "./useDebounce";
import { vi } from "vitest";

describe("useDebounce", () => {
  it("returns the same value after the delay", () => {
    vi.useFakeTimers();
    const { result, rerender } = renderHook(
      ({ value, delay }) => useDebounce(value, delay),
      { initialProps: { value: "test", delay: 500 } }
    );

    expect(result.current).toBe("test");

    rerender({ value: "test2", delay: 500 });

    expect(result.current).toBe("test");

    act(() => {
      vi.advanceTimersByTime(500);
    });

    expect(result.current).toBe("test2");
  });

  vi.useRealTimers();
});
