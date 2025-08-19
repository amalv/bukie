import { Column, Container, Grid } from "@/design/layout/grid";
import { BookCard } from "./BookCard";
import { BookCardSkeleton } from "./BookCard.skeleton";
import { emptyBox, errorBox, footer as footerClass } from "./BookList.css";
import type { Book } from "./types";

export type BookListProps = {
  books?: Book[];
  loading?: boolean;
  error?: string;
  /** Optional footer slot for pagination controls or extra actions */
  footer?: React.ReactNode;
  /** Optional current search string to improve empty-state copy */
  q?: string;
};

export function BookList({ books, loading, error, footer, q }: BookListProps) {
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
        <div role="alert" className={errorBox}>
          {error}
        </div>
      </Container>
    );
  }
  if (!loading && (!books || books.length === 0)) {
    return (
      <Container>
        <div className={emptyBox} aria-live="polite">
          <p style={{ margin: 0, fontWeight: 600 }}>No books found</p>
          <p style={{ margin: 0, opacity: 0.8 }}>
            {q ? (
              <>
                We couldn't find any results matching <em>"{q}"</em>.
              </>
            ) : (
              "Try searching by title, author, or genre."
            )}
          </p>
          <ul
            style={{
              listStyle: "disc",
              textAlign: "left",
              maxWidth: 560,
              margin: "0.75rem auto 0",
              padding: "0 1rem",
              opacity: 0.85,
              fontSize: "0.95em",
            }}
          >
            <li>Try a different title, author, or genre</li>
            <li>Check your spelling</li>
          </ul>
        </div>
      </Container>
    );
  }
  return (
    <Container>
      <Grid gap="lg">
        {books?.map((b) => (
          <Column key={b.id} span={{ base: 12, sm: 6, md: 3 }}>
            <BookCard book={b} />
          </Column>
        ))}
      </Grid>
      {footer ? <div className={footerClass}>{footer}</div> : null}
    </Container>
  );
}
