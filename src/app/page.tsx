export const dynamic = "force-dynamic";

import { Container } from "@/design/layout/grid";
import { BookList } from "@/features/books/BookList";
import { getBooks } from "@/features/books/data";
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
    const books = await getBooks(q);
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
                <p className={s.searchMeta}>
                  {books.length} {books.length === 1 ? "result" : "results"} for
                  "{q}"
                </p>
              ) : null}
            </header>
          </Container>
        </section>
        <BookList books={books} q={q} />
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
