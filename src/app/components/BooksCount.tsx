import { pageStyles as s } from "../pageStyles";

interface BooksCountProps {
  count: number;
  mode?: "found" | "shown";
}

export const BooksCount: React.FC<BooksCountProps> = ({
  count,
  mode = "found",
}) => {
  const noun = count === 1 ? "book" : "books";

  return (
    <div className={s.booksCount}>
      {count} {noun} {mode}
    </div>
  );
};
