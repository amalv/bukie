export const dynamic = "force-dynamic";

import Link from "next/link";
import { Container } from "@/design/layout/grid";
import { BookList } from "@/features/books/BookList";
import { getBooks } from "@/features/books/data";
import * as s from "./page.css";

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
              <h1 className={s.title}>My Book Collection</h1>
              <p className={s.subtitle}>Discover your next great read</p>
              <div className={s.searchRow}>
                <div className={s.searchBox}>
                  <search>
                    <form method="get">
                      <label htmlFor="q" className={s.srOnly}>
                        Search books
                      </label>
                      <svg
                        aria-hidden="true"
                        className={s.icon}
                        viewBox="0 0 24 24"
                        focusable="false"
                      >
                        <path
                          fill="currentColor"
                          d="M15.5 14h-.79l-.28-.27A6.471 6.471 0 0 0 16 9.5 6.5 6.5 0 1 0 9.5 16c1.61 0 3.09-.59 4.23-1.57l.27.28v.79l5 4.99L20.49 19l-4.99-5Zm-6 0C7.01 14 5 11.99 5 9.5S7.01 5 9.5 5 14 7.01 14 9.5 11.99 14 9.5 14Z"
                        />
                      </svg>
                      <input
                        id="q"
                        name="q"
                        type="search"
                        defaultValue={q}
                        placeholder="Search books, authors, or genres..."
                        className={s.input}
                      />
                    </form>
                  </search>
                </div>
                {q ? (
                  <Link href="/" className={s.clearLink}>
                    Clear
                  </Link>
                ) : null}
              </div>
            </header>
          </Container>
        </section>
        <BookList books={books} />
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
