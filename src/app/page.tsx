export const dynamic = "force-dynamic";

import { BookList } from "@/features/books/BookList";
import { getBooks } from "@/features/books/data";

async function fetchBooks() {
  return getBooks();
}

export default async function Page() {
  try {
    const books = await fetchBooks();
    return (
      <main>
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
