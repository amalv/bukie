"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import type { FormEvent } from "react";
import {
  CATALOG_SORTS,
  type CatalogCategory,
  type CatalogQuery,
  catalogSortLabel,
  DEFAULT_CATALOG_SORT,
  hasCatalogFilters,
  PUBLICATION_PERIODS,
  parseCatalogQuery,
  publicationPeriodLabel,
  serializeCatalogQuery,
} from "@/features/books/catalogQuery";

type Props = {
  categories: CatalogCategory[];
  categoriesUnavailable?: boolean;
  query: CatalogQuery;
};

export function CatalogFilters({
  categories,
  categoriesUnavailable = false,
  query,
}: Props) {
  const router = useRouter();
  const categoryLabel =
    categories.find((category) => category.slug === query.category)?.label ??
    query.category;
  const context = [
    query.q ? `Search: “${query.q}”` : undefined,
    categoryLabel ? `Category: ${categoryLabel}` : undefined,
    query.period
      ? `Published: ${publicationPeriodLabel(query.period)}`
      : undefined,
  ].filter((value): value is string => Boolean(value));

  function apply(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const params = new URLSearchParams(
      Array.from(new FormData(event.currentTarget).entries()).map(
        ([name, value]) => [name, String(value)],
      ),
    );
    const canonical = serializeCatalogQuery(parseCatalogQuery(params));
    router.push(canonical.size > 0 ? `/?${canonical}` : "/");
  }

  return (
    <div className="mt-[var(--spacing-2)] w-full max-w-[960px]">
      <form
        action="/"
        method="get"
        aria-label="Filter and sort catalog"
        className="grid grid-cols-1 gap-[var(--spacing-1)] rounded-[var(--radius-lg)] border border-[color:var(--color-outline)] bg-[var(--color-surface)] p-[var(--spacing-2)] text-left shadow-[var(--elevation-0)] sm:grid-cols-2 lg:grid-cols-[1fr_1fr_1fr_auto_auto]"
        onSubmit={apply}
      >
        {query.q ? <input type="hidden" name="q" value={query.q} /> : null}
        <label className="flex min-w-0 flex-col gap-[var(--spacing-0-5)] text-[var(--type-sm)] font-medium">
          Category
          <select
            className="min-h-11 rounded-[var(--radius-sm)] border border-[color:var(--color-outline)] bg-[var(--color-background)] px-[var(--spacing-1)] text-[var(--color-on-background)] focus-visible:border-[color:var(--color-primary)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[color:var(--color-primary)]"
            defaultValue={query.category ?? ""}
            name="category"
          >
            <option value="">All categories</option>
            {categories.map((category) => (
              <option value={category.slug} key={category.slug}>
                {category.label}
              </option>
            ))}
          </select>
        </label>
        <label className="flex min-w-0 flex-col gap-[var(--spacing-0-5)] text-[var(--type-sm)] font-medium">
          Publication period
          <select
            className="min-h-11 rounded-[var(--radius-sm)] border border-[color:var(--color-outline)] bg-[var(--color-background)] px-[var(--spacing-1)] text-[var(--color-on-background)] focus-visible:border-[color:var(--color-primary)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[color:var(--color-primary)]"
            defaultValue={query.period ?? ""}
            name="period"
          >
            <option value="">Any publication date</option>
            {PUBLICATION_PERIODS.map((period) => (
              <option value={period.value} key={period.value}>
                {period.label}
              </option>
            ))}
          </select>
        </label>
        <label className="flex min-w-0 flex-col gap-[var(--spacing-0-5)] text-[var(--type-sm)] font-medium">
          Sort by
          <select
            className="min-h-11 rounded-[var(--radius-sm)] border border-[color:var(--color-outline)] bg-[var(--color-background)] px-[var(--spacing-1)] text-[var(--color-on-background)] focus-visible:border-[color:var(--color-primary)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[color:var(--color-primary)]"
            defaultValue={query.sort}
            name="sort"
          >
            {CATALOG_SORTS.map((sort) => (
              <option value={sort} key={sort}>
                {catalogSortLabel(sort)}
              </option>
            ))}
          </select>
        </label>
        <button
          type="submit"
          className="min-h-11 self-end rounded-[var(--radius-sm)] bg-[var(--color-primary)] px-[var(--spacing-2)] font-semibold text-[var(--color-on-primary)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[color:var(--color-primary)]"
        >
          Apply
        </button>
        {hasCatalogFilters(query) || query.sort !== DEFAULT_CATALOG_SORT ? (
          <Link
            href="/"
            prefetch={false}
            className="inline-flex min-h-11 items-center justify-center self-end rounded-[var(--radius-sm)] px-[var(--spacing-1)] text-[var(--color-primary)] underline-offset-4 hover:underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[color:var(--color-primary)]"
          >
            Reset all
          </Link>
        ) : null}
      </form>
      <p
        className="mb-0 mt-[var(--spacing-1)] text-[var(--type-sm)] text-[var(--color-on-surface)]"
        aria-live="polite"
      >
        {hasCatalogFilters(query)
          ? `Active filters: ${context.join(" · ")}. ${catalogSortLabel(query.sort)}.`
          : `No active filters. ${catalogSortLabel(query.sort)}.`}
      </p>
      {categoriesUnavailable ? (
        <p
          className="mb-0 mt-[var(--spacing-0-5)] text-[var(--type-sm)] text-[var(--color-error)]"
          role="status"
        >
          Category options are temporarily unavailable. Search and the current
          URL filters still work.
        </p>
      ) : null}
    </div>
  );
}
