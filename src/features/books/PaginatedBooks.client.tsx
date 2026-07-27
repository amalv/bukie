"use client";

import { useCallback, useMemo, useState } from "react";
import { BooksCount } from "@/app/components/BooksCount";
import { pageStyles as page } from "@/app/pageStyles";
import { Container } from "@/design/layout/grid";
import { BookList } from "./BookList";
import { DEFAULT_BOOKS_PAGE_SIZE } from "./pageSize";
import type { PageResult } from "./pagination";
import type { WorkSummary } from "./types";

type Props = {
  initial: WorkSummary[];
  initialNextCursor?: string;
  q?: string;
  title?: string;
  limit?: number;
};

export function PaginatedBooks({
  initial,
  initialNextCursor,
  q,
  title,
  limit = DEFAULT_BOOKS_PAGE_SIZE,
}: Props) {
  const [items, setItems] = useState<WorkSummary[]>(initial);
  const [cursor, setCursor] = useState<string | undefined>(initialNextCursor);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | undefined>();
  const sectionTitle = title ?? (q ? "Search Results" : undefined);

  const params = useMemo(() => {
    const search = new URLSearchParams();
    if (q) search.set("q", q);
    if (cursor) search.set("after", cursor);
    search.set("limit", String(limit));
    return search.toString();
  }, [q, cursor, limit]);

  const loadMore = useCallback(async () => {
    if (!cursor || loading) return;
    setLoading(true);
    setError(undefined);
    try {
      const response = await fetch(`/api/books/page?${params}`, {
        cache: "no-store",
      });
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      const data = (await response.json()) as PageResult<WorkSummary>;
      setItems((current) => [...current, ...data.items]);
      setCursor(data.nextCursor);
    } catch {
      setError("Failed to load more books");
    } finally {
      setLoading(false);
    }
  }, [cursor, loading, params]);

  return (
    <>
      {sectionTitle ? (
        <Container>
          <header className={page.allBooksHeader}>
            <h2 className={page.sectionTitle}>{sectionTitle}</h2>
            <BooksCount count={items.length} mode="shown" />
          </header>
        </Container>
      ) : null}
      <BookList
        works={items}
        presentation={q ? "compact" : "grid"}
        q={q}
        footer={
          error ? (
            <div role="alert">{error}</div>
          ) : cursor ? (
            <button
              type="button"
              className="inline-flex items-center justify-center rounded-[var(--radius-lg)] border border-[color:var(--color-outline)] bg-[var(--color-surface)] px-[var(--spacing-3)] py-[var(--spacing-1-5)] text-lg leading-[1.2] text-[var(--color-on-surface)] no-underline shadow-[var(--elevation-1)] transition-[box-shadow,transform,border-color] duration-200 ease-out hover:-translate-y-px hover:border-[color:var(--color-primary)] hover:shadow-[var(--elevation-2)] focus-visible:-translate-y-px focus-visible:border-[color:var(--color-primary)] focus-visible:shadow-[var(--elevation-2)] focus-visible:outline-none active:translate-y-0 active:shadow-[var(--elevation-1)] disabled:cursor-not-allowed disabled:opacity-70"
              onClick={loadMore}
              disabled={loading}
            >
              {loading ? "Loading..." : "Load More Books"}
            </button>
          ) : null
        }
      />
    </>
  );
}
