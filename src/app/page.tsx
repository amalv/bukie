export const dynamic = "force-dynamic";

import Clock from "lucide-react/dist/esm/icons/clock.js";
import { Container } from "@/design/layout/grid";
import { BookList } from "@/features/books/BookList";
import {
  catalogQueryKey,
  DEFAULT_CATALOG_SORT,
  hasCatalogFilters,
  parseCatalogQuery,
} from "@/features/books/catalogQuery";
import { PaginatedBooks } from "@/features/books/PaginatedBooks.client";
import { DEFAULT_BOOKS_PAGE_SIZE } from "@/features/books/pageSize";
import {
  getCatalogCategories,
  getNewArrivals,
  getWorksPage,
} from "@/features/books/repo";
import {
  HOME_SECTIONS,
  NEW_ARRIVALS_PREVIEW_LIMIT,
  sectionContext,
} from "@/features/discovery/homeSections";
import { CatalogFilters } from "./CatalogFilters";
import { BooksCount } from "./components/BooksCount";
import { CategoryDiscovery } from "./components/CategoryDiscovery";
import { SectionHeader } from "./components/SectionHeader";
import { normalizeAfter } from "./helpers/pageParams";
import { pageStyles as s } from "./pageStyles";
import { SearchForm } from "./SearchForm";

type SearchParams = { [key: string]: string | string[] | undefined };

export default async function Page({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  try {
    const resolved = await searchParams;
    const query = parseCatalogQuery(resolved);
    const queryIsActive =
      hasCatalogFilters(query) || query.sort !== DEFAULT_CATALOG_SORT;
    const after = normalizeAfter(resolved?.after);
    const [pageResult, categoriesResult, arrivalsResult] =
      await Promise.allSettled([
        getWorksPage({
          query,
          after,
          limit: DEFAULT_BOOKS_PAGE_SIZE,
        }),
        getCatalogCategories(),
        queryIsActive
          ? Promise.resolve(undefined)
          : getNewArrivals(NEW_ARRIVALS_PREVIEW_LIMIT),
      ]);
    const categories =
      categoriesResult.status === "fulfilled" ? categoriesResult.value : [];
    const page =
      pageResult.status === "fulfilled" ? pageResult.value : undefined;
    const arrivals =
      arrivalsResult.status === "fulfilled" ? arrivalsResult.value : undefined;
    const queryKey = catalogQueryKey(query);
    const allBooks = HOME_SECTIONS["all-books"];
    const newArrivals = HOME_SECTIONS["new-arrivals"];
    const activeTitle = query.q
      ? "Search Results"
      : query.sort === "added"
        ? newArrivals.label
        : query.sort === "publication"
          ? "Books by Publication Date"
          : hasCatalogFilters(query)
            ? "Filtered Books"
            : allBooks.label;
    const activeDescription =
      query.sort === "added" && !hasCatalogFilters(query)
        ? newArrivals.userNeed
        : hasCatalogFilters(query)
          ? "Browse the catalog entries matching the search and filters above."
          : allBooks.userNeed;
    const activeContext =
      query.sort === "added" && !hasCatalogFilters(query)
        ? sectionContext(newArrivals)
        : query.sort === "publication" && !hasCatalogFilters(query)
          ? "Preferred-edition publication dates, newest first. Works without publication metadata follow."
          : undefined;

    return (
      <main>
        <section className={s.hero}>
          <Container>
            <header className={s.header}>
              <h1 className={s.title}>Discover Your Next Great Read</h1>
              <p className={s.subtitle}>
                Browse a curated catalog and search by title or author
              </p>
              <SearchForm
                key={`search-${queryKey}`}
                defaultValue={query.q}
                query={query}
              />
              <CatalogFilters
                key={`filters-${queryKey}`}
                categories={categories}
                categoriesUnavailable={categoriesResult.status === "rejected"}
                query={query}
              />
            </header>
          </Container>
        </section>

        <div className={s.contentSurface}>
          {!queryIsActive ? (
            <div>
              <CategoryDiscovery
                categories={categories}
                error={categoriesResult.status === "rejected"}
              />
              <div className={s.sectionDivider} />
              <section aria-labelledby="new-arrivals">
                <Container>
                  <SectionHeader
                    id="new-arrivals"
                    icon={
                      <Clock
                        className={s.sectionHeaderIcon}
                        width={20}
                        height={20}
                        aria-hidden
                      />
                    }
                    title={newArrivals.label}
                    description={newArrivals.userNeed}
                    context={sectionContext(newArrivals)}
                    action={
                      <a
                        className={s.sectionAction}
                        href={newArrivals.continuation.href}
                      >
                        {newArrivals.continuation.label}
                      </a>
                    }
                  />
                  {arrivals ? <BooksCount count={arrivals.length} /> : null}
                </Container>
                <BookList
                  works={arrivals}
                  error={
                    arrivalsResult.status === "rejected"
                      ? newArrivals.errorMessage
                      : undefined
                  }
                  emptyTitle="No arrivals yet"
                  emptyMessage={newArrivals.emptyMessage}
                  emptySuggestions={[]}
                  emptyAction={
                    <a className={s.sectionAction} href="#all-books">
                      Browse all books
                    </a>
                  }
                  spacing="dense"
                  testId="new-arrivals-list"
                />
              </section>
              <div className={s.sectionDivider} />
            </div>
          ) : null}

          {page ? (
            <section
              aria-labelledby={queryIsActive ? "catalog-results" : "all-books"}
            >
              <PaginatedBooks
                key={queryKey}
                initial={page.items}
                initialNextCursor={page.nextCursor}
                query={query}
                total={page.total}
                title={activeTitle}
                headingId={queryIsActive ? "catalog-results" : "all-books"}
                description={
                  queryIsActive ? activeDescription : allBooks.userNeed
                }
                context={
                  queryIsActive ? activeContext : sectionContext(allBooks)
                }
                emptyTitle={
                  queryIsActive ? "No matching books" : "Catalog not populated"
                }
                emptyMessage={queryIsActive ? undefined : allBooks.emptyMessage}
              />
            </section>
          ) : (
            <section aria-labelledby="catalog-unavailable">
              <Container>
                <SectionHeader
                  id="catalog-unavailable"
                  title={activeTitle}
                  description={
                    queryIsActive ? activeDescription : allBooks.userNeed
                  }
                  context={
                    queryIsActive ? activeContext : sectionContext(allBooks)
                  }
                />
              </Container>
              <BookList error={allBooks.errorMessage} />
            </section>
          )}
        </div>
      </main>
    );
  } catch (error) {
    console.error("Page render error:", error);
    return (
      <main>
        <BookList error="Failed to load books. Please try again." />
      </main>
    );
  }
}
