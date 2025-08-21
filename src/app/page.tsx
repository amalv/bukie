export const dynamic = "force-dynamic";

import { Container } from "@/design/layout/grid";
import { BookList } from "@/features/books/BookList";
import { getBooksPage } from "@/features/books/data";
import { PaginatedBooks } from "@/features/books/PaginatedBooks.client";
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
    const q = Array.isArray(rawQ) ? (rawQ[0] ?? "") : (rawQ ?? "");
    const afterRaw = resolved?.after;
    const after = Array.isArray(afterRaw)
      ? (afterRaw[0] ?? undefined)
      : afterRaw;
    const { items, nextCursor } = await getBooksPage({
      q,
      after,
      limit: 20,
    });
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
        <PaginatedBooks initial={items} initialNextCursor={nextCursor} q={q} />
      </main>
    );
  } catch {
    return (
      <main>
        <BookList error="Failed to load books. Please try again." />
      </main>
    );
  }
}
