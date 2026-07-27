export const dynamic = "force-dynamic";

import Clock from "lucide-react/dist/esm/icons/clock.js";
import { Container } from "@/design/layout/grid";
import { BookList } from "@/features/books/BookList";
import { PaginatedBooks } from "@/features/books/PaginatedBooks.client";
import { DEFAULT_BOOKS_PAGE_SIZE } from "@/features/books/pageSize";
import { getNewArrivals, getWorksPage } from "@/features/books/repo";
import { BooksCount } from "./components/BooksCount";
import { SectionHeader } from "./components/SectionHeader";
import { normalizeAfter, normalizeQ } from "./helpers/pageParams";
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
    const q = normalizeQ(resolved?.q);
    const rawSection = resolved?.section;
    const requestedSection =
      (Array.isArray(rawSection) ? rawSection[0] : rawSection) ?? "all";
    const section = requestedSection === "new" ? "new" : "all";
    const after = normalizeAfter(resolved?.after);
    const { items, nextCursor } = await getWorksPage({
      q,
      after,
      limit: DEFAULT_BOOKS_PAGE_SIZE,
    });
    const sectionItems =
      !q && section === "new" ? await getNewArrivals(20) : undefined;

    return (
      <main>
        <section className={s.hero}>
          <Container>
            <header className={s.header}>
              <h1 className={s.title}>Discover Your Next Great Read</h1>
              <p className={s.subtitle}>
                Browse a curated catalog and search by title or author
              </p>
              <SearchForm defaultValue={q} />
              {q ? (
                <p className={s.searchMeta}>Showing results for "{q}"</p>
              ) : null}
            </header>
          </Container>
        </section>

        {!q ? (
          <section className={s.contentSurface}>
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

            <div className={s.sectionDivider} />

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
            ) : null}

            {section === "all" && (items.length > 0 || nextCursor) ? (
              <PaginatedBooks
                initial={items}
                initialNextCursor={nextCursor}
                title="All Books"
              />
            ) : null}
          </section>
        ) : (
          <PaginatedBooks
            initial={items}
            initialNextCursor={nextCursor}
            q={q}
          />
        )}
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
