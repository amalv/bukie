import { darkThemeClass, lightThemeClass } from "@/design/tokens";
import { BookList } from "@/features/books/BookList";
import { workSummaryFixture } from "@/test/catalog-fixtures";

const sampleWorks = Array.from({ length: 8 }, (_, index) => ({
  ...workSummaryFixture,
  id: `work-${index}`,
  title: `${workSummaryFixture.title} ${index + 1}`,
}));

export default {
  title: "Books/BookList",
};

export const GridLight = () => (
  <div className={lightThemeClass}>
    <BookList works={sampleWorks} />
  </div>
);

export const GridDark = () => (
  <div
    className={darkThemeClass}
    style={{ background: "var(--color-background)", minHeight: "100vh" }}
  >
    <BookList works={sampleWorks} />
  </div>
);

export const Compact = () => (
  <div className={lightThemeClass}>
    <BookList works={sampleWorks.slice(0, 4)} presentation="compact" />
  </div>
);

export const Loading = () => <BookList loading />;
export const ErrorState = () => <BookList error="Failed to load books." />;
export const Empty = () => <BookList works={[]} />;
export const SectionEmpty = () => (
  <BookList
    works={[]}
    emptyTitle="No arrivals yet"
    emptyMessage="No catalog additions are available yet."
    emptySuggestions={[]}
    emptyAction={<a href="#all-books">Browse all books</a>}
  />
);
