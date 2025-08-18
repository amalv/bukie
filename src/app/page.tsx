export const dynamic = "force-dynamic";

import Link from "next/link";
import { BookList } from "@/features/books/BookList";
import { getBooks } from "@/features/books/data";

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
        <form method="get" style={{ padding: "1rem" }}>
          <label htmlFor="q" style={{ marginRight: 8 }}>
            Search
          </label>
          <input
            id="q"
            name="q"
            type="search"
            defaultValue={q}
            placeholder="Search books, authors..."
          />
          <button type="submit" style={{ marginLeft: 8 }}>
            Search
          </button>
          {q ? (
            <Link href="/" style={{ marginLeft: 8 }} aria-label="Clear search">
              Clear
            </Link>
          ) : null}
        </form>
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
