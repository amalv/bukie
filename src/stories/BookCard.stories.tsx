import { darkThemeClass, lightThemeClass } from "@/design/tokens";
import { BookCard } from "@/features/books/BookCard";
import { workSummaryFixture } from "@/test/catalog-fixtures";

export default {
  title: "Books/BookCard",
};

export const GridLight = () => (
  <div className={lightThemeClass} style={{ maxWidth: 240 }}>
    <BookCard work={workSummaryFixture} />
  </div>
);

export const GridDark = () => (
  <div
    className={darkThemeClass}
    style={{
      background: "var(--color-background)",
      maxWidth: 240,
      padding: 16,
    }}
  >
    <BookCard work={workSummaryFixture} />
  </div>
);

export const Compact = () => (
  <div className={lightThemeClass} style={{ maxWidth: 420 }}>
    <BookCard work={workSummaryFixture} presentation="compact" />
  </div>
);

export const MissingMetadata = () => (
  <div className={lightThemeClass} style={{ maxWidth: 240 }}>
    <BookCard
      work={{
        id: "missing",
        title: "Metadata Pending",
        authors: [],
      }}
    />
  </div>
);
