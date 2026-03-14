import { Column, Container, Grid } from "@/design/layout/grid";
import { BookCard } from "./BookCard";
import { BookCardSkeleton } from "./BookCard.skeleton";
import type { Book } from "./types";

export type BookListProps = {
  books?: Book[];
  loading?: boolean;
  error?: string;
  /** Optional footer slot for pagination controls or extra actions */
  footer?: React.ReactNode;
  /** Optional current search string to improve empty-state copy */
  q?: string;
  /** Spacing preset above the grid */
  spacing?: "normal" | "dense";
};

export function BookList({
  books,
  loading,
  error,
  footer,
  q,
  spacing = "normal",
}: BookListProps) {
  if (loading) {
    const skeletonKeys = [
      "sk-1",
      "sk-2",
      "sk-3",
      "sk-4",
      "sk-5",
      "sk-6",
      "sk-7",
      "sk-8",
    ] as const;
    return (
      <Container>
        <Grid gap="lg">
          {skeletonKeys.map((key) => (
            <Column key={key} span={{ base: 12, sm: 6, md: 3 }}>
              <BookCardSkeleton />
            </Column>
          ))}
        </Grid>
      </Container>
    );
  }
  if (error) {
    return (
      <Container>
        <div
          role="alert"
          className="rounded-[var(--radius-md)] border border-[color:var(--color-outline)] bg-[var(--color-surface)] p-[var(--spacing-3)] text-[var(--color-error)] shadow-[var(--elevation-0)]"
        >
          {error}
        </div>
      </Container>
    );
  }
  if (!loading && (!books || books.length === 0)) {
    return (
      <Container>
        <div
          className="rounded-[var(--radius-md)] border border-dashed border-[color:var(--color-outline)] bg-[var(--color-surface)] p-[var(--spacing-3)] text-center text-[var(--color-on-surface)] shadow-[var(--elevation-0)]"
          aria-live="polite"
        >
          <p className="m-0 font-semibold">No books found</p>
          <p className="m-0 opacity-80">
            {q ? (
              <>
                We couldn't find any results matching <em>"{q}"</em>.
              </>
            ) : (
              "Try searching by title, author, or genre."
            )}
          </p>
          <ul className="mx-auto mt-3 max-w-[560px] list-disc px-4 text-left text-[0.95em] opacity-85">
            <li>Try a different title, author, or genre</li>
            <li>Check your spelling</li>
          </ul>
        </div>
      </Container>
    );
  }
  return (
    <Container
      className={
        spacing === "dense"
          ? "book-list-grid-top-dense mt-[var(--spacing-2)] pt-[var(--spacing-1)] pb-[var(--spacing-2)]"
          : "book-list-grid-top mt-[var(--spacing-2)] pt-[var(--spacing-1)] pb-[var(--spacing-2)]"
      }
    >
      <Grid gap="lg">
        {books?.map((b) => (
          <Column key={b.id} span={{ base: 12, sm: 6, md: 3 }}>
            <BookCard book={b} />
          </Column>
        ))}
      </Grid>
      {footer ? (
        <div className="mt-[var(--spacing-3)] flex justify-center">
          {footer}
        </div>
      ) : null}
    </Container>
  );
}
