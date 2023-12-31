import { BookCard, Message } from "../";
import { Book } from "../../../../../../data/books";

interface BookWithFavoriteStatus extends Book {
  isFavorited: boolean;
}

export const BooksView = ({ books }: { books: BookWithFavoriteStatus[] }) =>
  books.length > 0 ? (
    books.map((book: BookWithFavoriteStatus) => (
      <BookCard key={book.id} book={book} isFavorited={book.isFavorited} />
    ))
  ) : (
    <Message text="No books available" />
  );
