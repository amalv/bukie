import { lightThemeClass } from "@/design/tokens.css";
import { BookList } from "@/features/books/BookList";
import { books } from "../../mocks/books";

export default {
  title: "Book List",
};

export const Basic = () => (
  <div className={lightThemeClass}>
    <BookList books={books} />
  </div>
);

export const Loading = () => (
  <div className={lightThemeClass}>
    <BookList loading />
  </div>
);

export const ErrorState = () => (
  <div className={lightThemeClass}>
    <BookList error="Failed to load books. Please try again." />
  </div>
);
