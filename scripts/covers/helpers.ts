import type { Book } from "@/features/books/types";

/**
 * Build Open Library cover URL candidates for a given book.
 * Strategy:
 * - If ISBN present, prefer ISBN route (L size).
 * - Otherwise build search-based candidates using title/author via cover id heuristic.
 *   Since we don't call the search API here (for testability), we generate the common
 *   cover patterns Open Library exposes when you already know cover ids.
 *   In practice, the fetcher can later be extended to call the search API to discover IDs.
 */
export function buildOpenLibraryCandidates(book: Pick<Book, "title" | "author" | "isbn">): string[] {
  const urls: string[] = [];
  const base = "https://covers.openlibrary.org";
  if (book.isbn) {
    const clean = book.isbn.replace(/[^0-9Xx]/g, "");
    urls.push(`${base}/b/isbn/${clean}-L.jpg`);
    urls.push(`${base}/b/isbn/${clean}-M.jpg`);
  }
  // Fallback: title + author search would normally be required to get a cover id (OLID or cover id).
  // As a heuristic, try title-only generic search thumbnails (may 404; fetcher will continue).
  const slug = `${book.title}`.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "");
  if (slug) {
    // These endpoints won't work without a real cover id; kept as placeholders for future extension.
    // The fetcher will iterate these and move on if they 404.
    urls.push(`${base}/b/title/${encodeURIComponent(book.title)}-L.jpg`);
    urls.push(`${base}/b/title/${encodeURIComponent(book.title)}-M.jpg`);
  }
  return urls;
}
