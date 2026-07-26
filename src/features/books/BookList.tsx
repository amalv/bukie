import { Column, Container, Grid } from "@/design/layout/grid";
import { BookCard } from "./BookCard";
import { BookCardSkeleton } from "./BookCard.skeleton";
import type { RatingPresentation } from "./presentation";
import type { Book } from "./types";

export type BookListProps = {
  books?: Book[];
  loading?: boolean;
  error?: string;
  /** Presentation selected by the containing surface. */
  presentation?: "grid" | "compact";
  /** Explicit, policy-approved rating state; raw catalog values are ignored. */
  getRatingPresentation?: (book: Book) => RatingPresentation | undefined;
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
  presentation = "grid",
  getRatingPresentation,
  footer,
  q,
  spacing = "normal",
}: BookListProps) {
  const isCompact = presentation === "compact";
  const columnSpan = isCompact ? 12 : { base: 6, sm: 4, md: 4, lg: 3, xl: 2 };

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
        <p className="sr-only" role="status">
          Loading books
        </p>
        <Grid
          aria-hidden="true"
          as="ul"
          className="m-0 list-none p-0"
          data-presentation={presentation}
          data-testid="book-list"
          gap="responsive"
        >
          {skeletonKeys.map((key) => (
            <Column
              as="li"
              className="min-w-0 list-none"
              key={key}
              span={columnSpan}
            >
              <BookCardSkeleton presentation={presentation} />
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
      <Grid
        as="ul"
        className="m-0 list-none p-0"
        data-presentation={presentation}
        data-testid="book-list"
        gap="responsive"
      >
        {books?.map((b) => (
          <Column
            as="li"
            className="min-w-0 list-none"
            key={b.id}
            span={columnSpan}
          >
            <BookCard
              book={b}
              presentation={presentation}
              ratingPresentation={getRatingPresentation?.(b)}
            />
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
