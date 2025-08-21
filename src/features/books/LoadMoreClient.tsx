"use client";

import { useCallback, useMemo, useState } from "react";
import { loadMoreButton } from "./BookList.css";
import type { Book } from "./types";

type Props = {
  nextCursor?: string;
  q?: string;
  onAppend?: (items: Book[]) => void;
};

export function LoadMoreClient({
  nextCursor: initialCursor,
  q,
  onAppend,
}: Props) {
  // Track only cursor and errors; parent keeps the rendered list.
  const [cursor, setCursor] = useState<string | undefined>(initialCursor);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | undefined>();

  const params = useMemo(() => {
    const usp = new URLSearchParams();
    if (q) usp.set("q", q);
    if (cursor) usp.set("after", cursor);
    usp.set("limit", "20");
    return usp.toString();
  }, [q, cursor]);

  const loadMore = useCallback(async () => {
    if (!cursor || loading) return;
    setLoading(true);
    setError(undefined);
    try {
      const res = await fetch(`/api/books/page?${params}`, {
        cache: "no-store",
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data: { items: Book[]; nextCursor?: string; hasNext: boolean } =
        await res.json();
      setCursor(data.nextCursor);
      onAppend?.(data.items);
    } catch {
      setError("Failed to load more books");
    } finally {
      setLoading(false);
    }
  }, [cursor, loading, params, onAppend]);

  return (
    <div
      style={{ display: "flex", justifyContent: "center", marginTop: "1rem" }}
    >
      {error ? (
        <div role="alert" style={{ marginRight: "1rem" }}>
          {error}
        </div>
      ) : null}
      {cursor ? (
        <button
          type="button"
          className={loadMoreButton}
          onClick={loadMore}
          disabled={loading}
        >
          {loading ? "Loading…" : "Load More Books"}
        </button>
      ) : null}
    </div>
  );
}
