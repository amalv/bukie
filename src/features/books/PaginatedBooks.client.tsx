"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import { BooksCount } from "@/app/components/BooksCount";
import { pageStyles as page } from "@/app/pageStyles";
import { Container } from "@/design/layout/grid";
import { BookList } from "./BookList";
import {
  type CatalogQuery,
  hasCatalogFilters,
  serializeCatalogPageQuery,
} from "./catalogQuery";
import { DEFAULT_BOOKS_PAGE_SIZE } from "./pageSize";
import type { PageResult } from "./pagination";
import type { WorkSummary } from "./types";

type Props = {
  initial: WorkSummary[];
  initialNextCursor?: string;
  query: CatalogQuery;
  total: number;
  title?: string;
  limit?: number;
};

export function PaginatedBooks({
  initial,
  initialNextCursor,
  query,
  total,
  title,
  limit = DEFAULT_BOOKS_PAGE_SIZE,
}: Props) {
  const [items, setItems] = useState<WorkSummary[]>(initial);
  const [cursor, setCursor] = useState<string | undefined>(initialNextCursor);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | undefined>();
  const sectionTitle = title ?? (query.q ? "Search Results" : undefined);
  const params = useMemo(
    () =>
      serializeCatalogPageQuery(query, {
        after: cursor,
        limit,
      }).toString(),
    [query, cursor, limit],
  );

  useEffect(() => {
    setItems(initial);
    setCursor(initialNextCursor);
    setError(undefined);
  }, [initial, initialNextCursor]);

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
            <BooksCount count={items.length} mode="shown" total={total} />
          </header>
        </Container>
      ) : null}
      <BookList
        works={items}
        presentation={query.q ? "compact" : "grid"}
        q={query.q}
        emptyMessage={
          hasCatalogFilters(query)
            ? "No books match the active search and filters."
            : undefined
        }
        emptyAction={
          hasCatalogFilters(query) ? (
            <Link
              href="/"
              prefetch={false}
              className="inline-flex min-h-11 items-center rounded-[var(--radius-sm)] bg-[var(--color-primary)] px-[var(--spacing-2)] font-semibold text-[var(--color-on-primary)] no-underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[color:var(--color-primary)]"
            >
              Reset all filters
            </Link>
          ) : undefined
        }
        footer={
          error || cursor || items.length > initial.length ? (
            <div className="flex flex-col items-center gap-[var(--spacing-1)]">
              {error ? <div role="alert">{error}</div> : null}
              <button
                type="button"
                className="inline-flex items-center justify-center rounded-[var(--radius-lg)] border border-[color:var(--color-outline)] bg-[var(--color-surface)] px-[var(--spacing-3)] py-[var(--spacing-1-5)] text-lg leading-[1.2] text-[var(--color-on-surface)] no-underline shadow-[var(--elevation-1)] transition-[box-shadow,transform,border-color] duration-200 ease-out hover:-translate-y-px hover:border-[color:var(--color-primary)] hover:shadow-[var(--elevation-2)] focus-visible:-translate-y-px focus-visible:border-[color:var(--color-primary)] focus-visible:shadow-[var(--elevation-2)] focus-visible:outline-none active:translate-y-0 active:shadow-[var(--elevation-1)] aria-disabled:cursor-not-allowed aria-disabled:opacity-70"
                onClick={loadMore}
                aria-disabled={loading || !cursor}
              >
                {loading
                  ? "Loading..."
                  : cursor
                    ? error
                      ? "Try Loading Again"
                      : "Load More Books"
                    : "All Matching Books Loaded"}
              </button>
            </div>
          ) : null
        }
      />
    </>
  );
}
