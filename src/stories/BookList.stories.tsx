import { darkThemeClass, lightThemeClass } from "@/design/tokens";
import { BookList } from "@/features/books/BookList";
import { books } from "../../mocks/books";

const sampleBooks = books.slice(0, 12);

export default {
  title: "Book List",
};

export const GridLight = () => (
  <div className={lightThemeClass}>
    <BookList books={sampleBooks} />
  </div>
);

export const GridDark = () => (
  <div
    className={darkThemeClass}
    style={{ background: "var(--color-background)", minHeight: "100vh" }}
  >
    <BookList books={sampleBooks} />
  </div>
);

export const Compact = () => (
  <div className={lightThemeClass}>
    <BookList books={sampleBooks.slice(0, 4)} presentation="compact" />
  </div>
);

export const GridLoading = () => (
  <div className={lightThemeClass}>
    <BookList loading />
  </div>
);

export const CompactLoading = () => (
  <div className={lightThemeClass}>
    <BookList loading presentation="compact" />
  </div>
);

export const ExplicitEligibleRatings = () => (
  <div className={lightThemeClass}>
    <BookList
      books={sampleBooks.slice(0, 6)}
      getRatingPresentation={(book) =>
        typeof book.rating === "number" && typeof book.ratingsCount === "number"
          ? {
              state: "eligible",
              average: book.rating,
              count: book.ratingsCount,
            }
          : { state: "unrated" }
      }
    />
  </div>
);

export const ErrorState = () => (
  <div className={lightThemeClass}>
    <BookList error="Failed to load books. Please try again." />
  </div>
);

export const Empty = () => (
  <div className={lightThemeClass}>
    <BookList books={[]} />
  </div>
);

export const WithFooter = () => (
  <div className={lightThemeClass}>
    <BookList
      books={sampleBooks.slice(0, 4)}
      footer={<div style={{ padding: "1rem" }}>Pagination coming soon...</div>}
    />
  </div>
);
