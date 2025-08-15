import type { Book } from "../src/features/books/types";

export const books: Book[] = Array.from({ length: 50 }, (_, i) => ({
  id: String(i + 1),
  title: `Book Title ${i + 1}`,
  author: `Author ${i + 1}`,
  cover: `https://placehold.co/120x180.png?text=${encodeURIComponent("Book "+(i+1))}`,
  genre: i % 3 === 0 ? "Sci-Fi" : i % 3 === 1 ? "Fantasy" : "Drama",
  rating: (Math.round(((i % 5) + 1 + (i % 2 ? 0.5 : 0)) * 10) / 10) % 5,
  year: 1990 + (i % 30),
}));
