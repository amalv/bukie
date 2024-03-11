import { BookCard, Message } from "../";

import type { Book } from "@/data/books";

export const BooksView = ({ books }: { books: Book[] }) =>
  books.length > 0 ? (
    books.map((book: Book) => <BookCard key={book.id} book={book} />)
  ) : (
    <Message text="No books available" />
  );
