import Link from "next/link";
import { Container } from "@/design/layout/grid";
import type { CatalogCategory } from "@/features/books/catalogQuery";
import {
  categoryCatalogHref,
  HOME_SECTIONS,
  sectionContext,
} from "@/features/discovery/homeSections";
import { SectionHeader } from "./SectionHeader";

type Props = {
  categories?: CatalogCategory[];
  error?: boolean;
  loading?: boolean;
};

const definition = HOME_SECTIONS.categories;

export function CategoryDiscovery({
  categories,
  error = false,
  loading = false,
}: Props) {
  return (
    <section aria-labelledby="browse-by-category">
      <Container>
        <SectionHeader
          id="browse-by-category"
          title={definition.label}
          description={definition.userNeed}
          context={sectionContext(definition)}
        />
        {loading ? (
          <>
            <p className="sr-only" role="status">
              Loading catalog categories
            </p>
            <ul
              aria-hidden="true"
              className="grid list-none grid-cols-2 gap-[var(--spacing-1)] p-0 sm:grid-cols-3 lg:grid-cols-5"
              data-testid="category-list"
            >
              {["one", "two", "three", "four", "five"].map((key) => (
                <li
                  className="h-14 animate-pulse rounded-[var(--radius-md)] bg-[var(--color-overlay)] motion-reduce:animate-none"
                  key={key}
                />
              ))}
            </ul>
          </>
        ) : error ? (
          <div
            role="alert"
            className="rounded-[var(--radius-md)] border border-[color:var(--color-outline)] bg-[var(--color-background)] p-[var(--spacing-2)] text-[var(--color-error)]"
          >
            <p className="m-0">{definition.errorMessage}</p>
            <a
              className="mt-[var(--spacing-1)] inline-flex min-h-11 items-center text-[var(--color-primary)] underline underline-offset-4 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[color:var(--color-primary)]"
              href={definition.continuation.href}
            >
              {definition.continuation.label}
            </a>
          </div>
        ) : categories && categories.length > 0 ? (
          <ul
            className="grid list-none grid-cols-2 gap-[var(--spacing-1)] p-0 sm:grid-cols-3 lg:grid-cols-5"
            data-testid="category-list"
          >
            {categories.map((category) => (
              <li className="min-w-0" key={category.slug}>
                <Link
                  href={categoryCatalogHref(category.slug)}
                  prefetch={false}
                  aria-label={`${category.label} books`}
                  data-discovery-link
                  className="flex min-h-14 items-center justify-between gap-[var(--spacing-1)] rounded-[var(--radius-md)] border border-[color:var(--color-outline)] bg-[var(--color-background)] px-[var(--spacing-2)] py-[var(--spacing-1)] font-semibold text-[var(--color-on-background)] shadow-[var(--elevation-0)] transition-[border-color,background-color,box-shadow] duration-150 hover:border-[color:var(--color-primary)] hover:bg-[var(--color-overlay)] hover:shadow-[var(--elevation-1)] focus-visible:border-[color:var(--color-primary)] focus-visible:bg-[var(--color-overlay)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[color:var(--color-primary)] motion-reduce:transition-none"
                >
                  <span className="min-w-0">{category.label}</span>
                  <span aria-hidden="true">→</span>
                </Link>
              </li>
            ))}
          </ul>
        ) : (
          <div
            className="rounded-[var(--radius-md)] border border-dashed border-[color:var(--color-outline)] bg-[var(--color-background)] p-[var(--spacing-2)]"
            aria-live="polite"
          >
            <p className="m-0">{definition.emptyMessage}</p>
            <a
              className="mt-[var(--spacing-1)] inline-flex min-h-11 items-center text-[var(--color-primary)] underline underline-offset-4 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[color:var(--color-primary)]"
              href={definition.continuation.href}
            >
              {definition.continuation.label}
            </a>
          </div>
        )}
      </Container>
    </section>
  );
}
