"use client";

import { useCallback, useMemo, useState } from "react";
import { BookList } from "./BookList";
import { loadMoreButton } from "./BookList.css";
import type { PageResult } from "./pagination";
import type { Book } from "./types";

type Props = {
  initial: Book[];
  initialNextCursor?: string;
  q?: string;
  limit?: number;
};

export function PaginatedBooks({
  initial,
  initialNextCursor,
  q,
  limit = 20,
}: Props) {
  const [items, setItems] = useState<Book[]>(initial);
  const [cursor, setCursor] = useState<string | undefined>(initialNextCursor);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | undefined>();

  const params = useMemo(() => {
    const usp = new URLSearchParams();
    if (q) usp.set("q", q);
    if (cursor) usp.set("after", cursor);
    usp.set("limit", String(limit));
    return usp.toString();
  }, [q, cursor, limit]);

  const loadMore = useCallback(async () => {
    if (!cursor || loading) return;
    setLoading(true);
    setError(undefined);
    try {
      const res = await fetch(`/api/books/page?${params}`, {
        cache: "no-store",
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = (await res.json()) as PageResult<Book>;
      setItems((prev) => [...prev, ...data.items]);
      setCursor(data.nextCursor);
    } catch {
      setError("Failed to load more books");
    } finally {
      setLoading(false);
    }
  }, [cursor, loading, params]);

  return (
    <BookList
      books={items}
      q={q}
      footer={
        error ? (
          <div role="alert">{error}</div>
        ) : cursor ? (
          <button
            type="button"
            className={loadMoreButton}
            onClick={loadMore}
            disabled={loading}
          >
            {loading ? "Loading…" : "Load More Books"}
          </button>
        ) : null
      }
    />
  );
}
