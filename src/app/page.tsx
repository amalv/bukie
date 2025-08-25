export const dynamic = "force-dynamic";

import Clock from "lucide-react/dist/esm/icons/clock.js";
import Medal from "lucide-react/dist/esm/icons/medal.js";
import TrendingUp from "lucide-react/dist/esm/icons/trending-up.js";
import { Container } from "@/design/layout/grid";
import { BookList } from "@/features/books/BookList";
import { getBooksPage } from "@/features/books/data";
import { PaginatedBooks } from "@/features/books/PaginatedBooks.client";
import {
  getNewArrivals,
  getTopRated,
  getTrendingNow,
} from "@/features/books/repo";
import { normalizeAfter, normalizeQ } from "./helpers/pageParams";
import * as s from "./page.css";
import { SearchForm } from "./SearchForm";

type SearchParams = { [key: string]: string | string[] | undefined };

export default async function Page({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  try {
    const resolved = await searchParams;
    const rawQ = resolved?.q;
    const q = normalizeQ(rawQ);
    const rawSection = resolved?.section;
    const section =
      (Array.isArray(rawSection) ? rawSection[0] : rawSection) ?? "new";
    const afterRaw = resolved?.after;
    const after = normalizeAfter(afterRaw);

    const { items, nextCursor } = await getBooksPage({ q, after, limit: 20 });

    const showSections = !q;
    const sectionItems = showSections
      ? section === "all"
        ? undefined
        : section === "top"
          ? await getTopRated(20, 10)
          : section === "trending"
            ? await getTrendingNow(20)
            : await getNewArrivals(20)
      : undefined;

    // Note: we use the paginated `items` and `nextCursor` as the initial
    // page for the client-side `PaginatedBooks` component when the user
    // selects the "All" section so we don't fetch the entire dataset.

    return (
      <main>
        <section className={s.hero}>
          <Container>
            <header className={s.header}>
              <h1 className={s.title}>Discover Your Next Great Read</h1>
              <p className={s.subtitle}>
                Explore curated collections, read reviews, and find books that
                match your taste
              </p>
              <SearchForm defaultValue={q} />
              {q ? (
                <p className={s.searchMeta}>Showing results for "{q}"</p>
              ) : null}
            </header>
          </Container>
        </section>

        {showSections ? (
          <section className={s.contentSurface}>
            <Container>
              <nav aria-label="Sections" className={s.sectionsNav}>
                <ul className={s.tabsList}>
                  <li>
                    <a
                      href="/?section=all"
                      className={s.tabLink}
                      aria-current={section === "all" ? "page" : undefined}
                    >
                      All
                    </a>
                  </li>
                  <li>
                    <a
                      href="/?section=new"
                      className={s.tabLink}
                      aria-current={section === "new" ? "page" : undefined}
                    >
                      <Clock width={16} height={16} aria-hidden /> New Arrivals
                    </a>
                  </li>
                  <li>
                    <a
                      href="/?section=top"
                      className={s.tabLink}
                      aria-current={section === "top" ? "page" : undefined}
                    >
                      <Medal width={16} height={16} aria-hidden /> Top Rated
                    </a>
                  </li>
                  <li>
                    <a
                      href="/?section=trending"
                      className={s.tabLink}
                      aria-current={section === "trending" ? "page" : undefined}
                    >
                      <TrendingUp width={16} height={16} aria-hidden /> Trending
                      Now
                    </a>
                  </li>
                </ul>
              </nav>
            </Container>

            <div className={s.sectionDivider} />

            {sectionItems ? (
              <Container>
                <header className={s.sectionHeader}>
                  <div className={s.sectionTitleRow}>
                    {section === "top" ? (
                      <Medal
                        className={s.sectionHeaderIcon}
                        width={20}
                        height={20}
                        aria-hidden
                      />
                    ) : section === "trending" ? (
                      <TrendingUp
                        className={s.sectionHeaderIcon}
                        width={20}
                        height={20}
                        aria-hidden
                      />
                    ) : (
                      <Clock
                        className={s.sectionHeaderIcon}
                        width={20}
                        height={20}
                        aria-hidden
                      />
                    )}
                    <h2 className={s.sectionTitle}>
                      {section === "top"
                        ? "Top Rated"
                        : section === "trending"
                          ? "Trending Now"
                          : "New Arrivals"}
                    </h2>
                  </div>
                  <div className={s.booksCount}>
                    {sectionItems.length} books found
                  </div>
                </header>
              </Container>
            ) : null}

            {sectionItems ? (
              <BookList books={sectionItems} spacing="dense" />
            ) : null}

            {/* All Books listing (shows the full available list and a count) - only when "All" is selected */}
            {section === "all" ? (
              <>
                <Container>
                  <header className={s.sectionHeader}>
                    <h2 className={s.sectionTitle}>All Books</h2>
                    <div className={s.booksCount}>
                      {items.length} books found
                    </div>
                  </header>
                </Container>
                <PaginatedBooks
                  initial={items}
                  initialNextCursor={nextCursor}
                  q={q}
                />
              </>
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
  } catch (err) {
    // Surface server-side render errors in the dev terminal to aid debugging
    // (kept lightweight to avoid leaking secrets in production)
    // eslint-disable-next-line no-console
    console.error("Page render error:", err);
    return (
      <main>
        <BookList error="Failed to load books. Please try again." />
      </main>
    );
  }
}
