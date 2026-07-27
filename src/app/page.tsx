export const dynamic = "force-dynamic";

import Clock from "lucide-react/dist/esm/icons/clock.js";
import { Container } from "@/design/layout/grid";
import { BookList } from "@/features/books/BookList";
import {
  DEFAULT_CATALOG_SORT,
  hasCatalogFilters,
  parseCatalogQuery,
  serializeCatalogQuery,
} from "@/features/books/catalogQuery";
import { PaginatedBooks } from "@/features/books/PaginatedBooks.client";
import { DEFAULT_BOOKS_PAGE_SIZE } from "@/features/books/pageSize";
import {
  getCatalogCategories,
  getNewArrivals,
  getWorksPage,
} from "@/features/books/repo";
import { CatalogFilters } from "./CatalogFilters";
import { BooksCount } from "./components/BooksCount";
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
    const rawSection = resolved?.section;
    const requestedSection =
      (Array.isArray(rawSection) ? rawSection[0] : rawSection) ?? "all";
    const queryIsActive =
      hasCatalogFilters(query) || query.sort !== DEFAULT_CATALOG_SORT;
    const section =
      requestedSection === "new" && !queryIsActive ? "new" : "all";
    const after = normalizeAfter(resolved?.after);
    const [{ items, nextCursor, total }, categories, sectionItems] =
      await Promise.all([
        getWorksPage({
          query,
          after,
          limit: DEFAULT_BOOKS_PAGE_SIZE,
        }),
        getCatalogCategories(),
        section === "new" ? getNewArrivals(20) : undefined,
      ]);
    const queryKey = serializeCatalogQuery(query).toString();

    return (
      <main>
        <section className={s.hero}>
          <Container>
            <header className={s.header}>
              <h1 className={s.title}>Discover Your Next Great Read</h1>
              <p className={s.subtitle}>
                Browse a curated catalog and search by title or author
              </p>
              <SearchForm defaultValue={query.q} query={query} />
              <CatalogFilters categories={categories} query={query} />
            </header>
          </Container>
        </section>

        <section className={s.contentSurface}>
          {!queryIsActive ? (
            <Container>
              <nav aria-label="Sections" className={s.sectionsNav}>
                <ul className={s.tabsList}>
                  <li>
                    <a
                      href="/?section=all"
                      className={s.tabLink(section === "all")}
                      aria-current={section === "all" ? "page" : undefined}
                    >
                      All
                    </a>
                  </li>
                  <li>
                    <a
                      href="/?section=new"
                      className={s.tabLink(section === "new")}
                      aria-current={section === "new" ? "page" : undefined}
                    >
                      <Clock width={16} height={16} aria-hidden /> New Arrivals
                    </a>
                  </li>
                </ul>
              </nav>
            </Container>
          ) : null}

          {!queryIsActive ? <div className={s.sectionDivider} /> : null}

          {sectionItems ? (
            <>
              <Container>
                <SectionHeader
                  icon={
                    <Clock
                      className={s.sectionHeaderIcon}
                      width={20}
                      height={20}
                      aria-hidden
                    />
                  }
                  title="New Arrivals"
                />
                <BooksCount count={sectionItems.length} />
              </Container>
              <BookList works={sectionItems} spacing="dense" />
            </>
          ) : (
            <PaginatedBooks
              key={queryKey}
              initial={items}
              initialNextCursor={nextCursor}
              query={query}
              total={total}
              title={
                query.q
                  ? "Search Results"
                  : hasCatalogFilters(query)
                    ? "Filtered Books"
                    : "All Books"
              }
            />
          )}
        </section>
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
