import * as s from "../page.css";

interface BooksCountProps {
  count: number;
}

export const BooksCount: React.FC<BooksCountProps> = ({ count }) => (
  <div className={s.booksCount}>{count} books found</div>
);
