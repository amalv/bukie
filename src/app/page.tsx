import { headers as getRequestHeaders } from "next/headers";
import { BookList } from "@/features/books/BookList";
import type { Book } from "@/features/books/types";

async function getBaseUrl(): Promise<string> {
  const h = await getRequestHeaders();
  // In some runtimes, headers may be a Promise; awaiting covers both cases.
  const proto = (h as Headers).get("x-forwarded-proto") ?? "http";
  const host = (h as Headers).get("host");
  if (host) return `${proto}://${host}`;
  if (process.env.NEXT_PUBLIC_SITE_URL) return process.env.NEXT_PUBLIC_SITE_URL;
  if (process.env.VERCEL_URL) return `https://${process.env.VERCEL_URL}`;
  const port = process.env.PORT ?? "3000";
  return `http://localhost:${port}`;
}

async function fetchBooks(): Promise<Book[]> {
  const baseUrl = await getBaseUrl();
  const res = await fetch(`${baseUrl}/api/books`, { cache: "no-store" });
  if (!res.ok) throw new Error("Failed to fetch books");
  return (await res.json()) as Book[];
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
