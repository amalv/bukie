import type { Book } from "../src/features/books/types";

export const books: Book[] = Array.from({ length: 50 }, (_, i) => ({
  id: String(i + 1),
  title: `Book Title ${i + 1}`,
  author: `Author ${i + 1}`,
  cover: `https://placehold.co/120x180.png?text=${encodeURIComponent("Book "+(i+1))}`,
}));
