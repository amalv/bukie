import { renderHook } from "@testing-library/react";
import { RefObject } from "react";
import { vi } from "vitest";

import { useIntersectionObserver } from "./useIntersectionObserver";

interface MockIntersectionObserver extends IntersectionObserver {
  triggerCallback(entries: IntersectionObserverEntry[]): void;
}

class MockIntersectionObserverImpl implements MockIntersectionObserver {
  root: Element | null = null;
  rootMargin = "";
  thresholds: ReadonlyArray<number> = [0];
  disconnect: () => void = () => {};
  takeRecords: () => IntersectionObserverEntry[] = () => [];
  callback: (entries: IntersectionObserverEntry[]) => void;
  loading: boolean;

  constructor(
    callback: (entries: IntersectionObserverEntry[]) => void,
    loading: boolean,
  ) {
    this.callback = callback;
    this.loading = loading;
  }

  observe() {
    if (!this.loading) {
      this.callback([{ isIntersecting: true } as IntersectionObserverEntry]);
    }
  }

  unobserve() {}

  triggerCallback(entries: IntersectionObserverEntry[]) {
    this.callback(entries);
  }
}
global.IntersectionObserver =
  MockIntersectionObserverImpl as unknown as typeof IntersectionObserver;

let loader: RefObject<HTMLElement>;

beforeEach(() => {
  loader = { current: document.createElement("div") };
});

test("calls handleFetchMore when loader is visible", () => {
  const handleFetchMore = vi.fn();
  const lastPageReachedRef = { current: false };

  const mockIntersectionObserver = new MockIntersectionObserverImpl(
    handleFetchMore,
    false,
  );

  renderHook(() =>
    useIntersectionObserver(loader, handleFetchMore, false, lastPageReachedRef),
  );

  // simulate an intersection event where the loader is visible
  mockIntersectionObserver.triggerCallback([
    { isIntersecting: true } as IntersectionObserverEntry,
  ]);

  expect(handleFetchMore).toHaveBeenCalled();
});

test("does not call handleFetchMore when loader is not visible", () => {
  const handleFetchMore = vi.fn();
  const lastPageReachedRef = { current: false };

  const mockIntersectionObserver = new MockIntersectionObserverImpl(
    () => {},
    false,
  );

  renderHook(() =>
    useIntersectionObserver(loader, handleFetchMore, false, lastPageReachedRef),
  );

  // simulate an intersection event where the loader is not visible
  mockIntersectionObserver.triggerCallback([
    { isIntersecting: false } as IntersectionObserverEntry,
  ]);

  expect(handleFetchMore).not.toHaveBeenCalled();
});

test("does not call handleFetchMore when data is loading", () => {
  const handleFetchMore = vi.fn();
  const lastPageReachedRef = { current: false };

  renderHook(() =>
    useIntersectionObserver(loader, handleFetchMore, true, lastPageReachedRef),
  );

  expect(handleFetchMore).not.toHaveBeenCalled();
});

test("does not call handlefetchmore when last page has been reached", () => {
  const handleFetchMore = vi.fn();
  const lastPageReachedRef = { current: true };

  renderHook(() =>
    useIntersectionObserver(loader, handleFetchMore, false, lastPageReachedRef),
  );

  expect(handleFetchMore).not.toHaveBeenCalled();
});
