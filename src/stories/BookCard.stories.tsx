import type { ReactNode } from "react";
import { darkThemeClass, lightThemeClass } from "@/design/tokens";
import { BookCard } from "@/features/books/BookCard";
import type { RatingPresentation } from "@/features/books/presentation";
import type { Book } from "@/features/books/types";

export default {
  title: "Book Card",
};

const fullBook: Book = {
  id: "full",
  title: "Neuromancer",
  author: "William Gibson",
  authors: ["William Gibson", "A. Collaborator"],
  cover: "/covers/placeholder.svg",
  genre: "Science Fiction",
  rating: 4.5,
  ratingsCount: 12847,
  year: 1984,
};

const eligibleRating: RatingPresentation = {
  state: "eligible",
  average: 4.46,
  count: 12847,
};

function Frame({
  children,
  dark = false,
  width = 224,
}: {
  children: ReactNode;
  dark?: boolean;
  width?: number;
}) {
  return (
    <div
      className={dark ? darkThemeClass : lightThemeClass}
      style={{
        background: "var(--color-background)",
        minHeight: 320,
        padding: 24,
      }}
    >
      <div style={{ maxWidth: width }}>{children}</div>
    </div>
  );
}

export const GridFullLight = () => (
  <Frame>
    <BookCard book={fullBook} ratingPresentation={eligibleRating} />
  </Frame>
);

export const GridFullDark = () => (
  <Frame dark>
    <BookCard book={fullBook} ratingPresentation={eligibleRating} />
  </Frame>
);

export const GridLongMetadata = () => (
  <Frame>
    <BookCard
      book={{
        ...fullBook,
        id: "long",
        title:
          "The Extremely Long and Unexpectedly Detailed Chronicle of a Library at the Edge of Every Known World",
        author: "Alexandra Example",
        authors: [
          "Alexandra Example",
          "Benjamin Longname",
          "Carmen Third",
          "Devon Fourth",
        ],
        genre: "Speculative Historical Science Fiction",
      }}
      ratingPresentation={eligibleRating}
    />
  </Frame>
);

export const GridMinimal = () => (
  <Frame>
    <BookCard
      book={{
        id: "minimal",
        title: "A Minimal Work",
        author: "Anonymous",
        cover: "/covers/placeholder.svg",
      }}
    />
  </Frame>
);

export const GridMinimalDark = () => (
  <Frame dark>
    <BookCard
      book={{
        id: "minimal-dark",
        title: "A Minimal Work",
        author: "Anonymous",
        cover: "/covers/placeholder.svg",
      }}
    />
  </Frame>
);

export const GridMissingCoverAndPublication = () => (
  <Frame>
    <BookCard
      book={{
        id: "missing",
        title: "The Coverless Book",
        author: "Stored Author",
        cover: "",
        genre: "Classics",
      }}
    />
  </Frame>
);

export const GridUnrated = () => (
  <Frame>
    <BookCard book={fullBook} ratingPresentation={{ state: "unrated" }} />
  </Frame>
);

export const GridRatingUnavailable = () => (
  <Frame>
    <BookCard book={fullBook} ratingPresentation={{ state: "unavailable" }} />
  </Frame>
);

export const CompactFull = () => (
  <Frame width={560}>
    <BookCard
      book={fullBook}
      presentation="compact"
      ratingPresentation={eligibleRating}
    />
  </Frame>
);

export const CompactFullDark = () => (
  <Frame dark width={560}>
    <BookCard
      book={fullBook}
      presentation="compact"
      ratingPresentation={eligibleRating}
    />
  </Frame>
);

export const CompactLongMetadata = () => (
  <Frame width={560}>
    <BookCard
      book={{
        ...fullBook,
        id: "compact-long",
        title:
          "The Extremely Long and Unexpectedly Detailed Chronicle of a Library at the Edge of Every Known World",
        authors: ["Alexandra Example", "Benjamin Longname", "Carmen Third"],
        genre: "Speculative Historical Science Fiction",
      }}
      presentation="compact"
      ratingPresentation={{ state: "unavailable" }}
    />
  </Frame>
);
