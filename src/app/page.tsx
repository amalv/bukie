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
import { BooksCount } from "./components/BooksCount";
import { SectionHeader } from "./components/SectionHeader";
import { normalizeAfter, normalizeQ } from "./helpers/pageParams";
import { getSectionHeader } from "./helpers/sectionHeader";
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
      (Array.isArray(rawSection) ? rawSection[0] : rawSection) ?? "all";
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

    const sectionHeader = getSectionHeader(section);

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
                <SectionHeader
                  icon={sectionHeader.icon}
                  title={sectionHeader.title}
                />
                <BooksCount count={sectionItems.length} />
              </Container>
            ) : null}

            {sectionItems ? (
              <BookList books={sectionItems} spacing="dense" />
            ) : null}

            {/* All Books listing (shows the full available list and a count) - only when "All" is selected */}
            {section === "all" ? (
              // Only show the All header when we actually have items or a next
              // cursor (prevents an empty header when the initial page is empty)
              items.length > 0 || nextCursor ? (
                <>
                  <Container>
                    <header className={s.allBooksHeader}>
                      <h2 className={s.sectionTitle}>All Books</h2>
                      <BooksCount count={items.length} />
                    </header>
                  </Container>
                  <PaginatedBooks
                    initial={items}
                    initialNextCursor={nextCursor}
                    q={q}
                  />
                </>
              ) : null
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
