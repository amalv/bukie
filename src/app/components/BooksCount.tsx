import { pageStyles as s } from "../pageStyles";

interface BooksCountProps {
  count: number;
  mode?: "found" | "shown";
  total?: number;
}

export const BooksCount: React.FC<BooksCountProps> = ({
  count,
  mode = "found",
  total,
}) => {
  if (mode === "shown" && total !== undefined) {
    const noun = total === 1 ? "book" : "books";
    return (
      <div className={s.booksCount}>
        {count} of {total} {noun} shown
      </div>
    );
  }

  const noun = count === 1 ? "book" : "books";

  return (
    <div className={s.booksCount}>
      {count} {noun} {mode}
    </div>
  );
};
