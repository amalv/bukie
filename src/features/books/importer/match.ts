import type { Book } from "../types";
import { normalizeIsbn } from "./validate";

type ExistingBook = Pick<Book, "id" | "title" | "author" | "isbn">;

type MatchCandidate = {
  title: string;
  author: string;
  isbn?: string | null;
};

function normalizeText(value: string): string {
  return value.trim().toLowerCase();
}

function buildAuthorTitleKey(title: string, author: string): string {
  return `${normalizeText(title)}|${normalizeText(author)}`;
}

export function createExistingBookMatcher(existing: ExistingBook[]) {
  const byIsbn = new Map<string, string>();
  const byTitleAuthor = new Map<string, string>();

  for (const book of existing) {
    const normalizedIsbn = normalizeIsbn(book.isbn);
    if (normalizedIsbn) {
      byIsbn.set(normalizedIsbn, book.id);
    }

    const title = book.title?.trim();
    const author = book.author?.trim();
    if (title && author) {
      byTitleAuthor.set(buildAuthorTitleKey(title, author), book.id);
    }
  }

  return ({ title, author, isbn }: MatchCandidate): string | undefined => {
    const normalizedIsbn = normalizeIsbn(isbn);
    if (normalizedIsbn) {
      const matchedByIsbn = byIsbn.get(normalizedIsbn);
      if (matchedByIsbn) return matchedByIsbn;
    }

    return byTitleAuthor.get(buildAuthorTitleKey(title, author));
  };
}
