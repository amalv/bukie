import BookOpen from "lucide-react/dist/esm/icons/book-open.js";

export function BookDetailsLoading() {
  return (
    <main
      aria-busy="true"
      aria-labelledby="book-loading-heading"
      className="bg-[var(--color-background)] px-[var(--spacing-2)] text-[var(--color-on-background)] sm:px-[var(--spacing-3)]"
      data-book-detail-loading
    >
      <div className="mx-auto flex min-h-[calc(100svh-7rem)] max-w-[1200px] items-center justify-center py-[var(--spacing-4)]">
        <div
          className="flex flex-col items-center gap-[var(--spacing-2)] text-center"
          role="status"
        >
          <div
            className="relative flex aspect-[2/3] w-20 items-center justify-center overflow-hidden rounded-[var(--radius-md)] border border-[color:var(--color-outline)] bg-[var(--color-surface)] shadow-[var(--elevation-1)] sm:w-24"
            aria-hidden="true"
          >
            <div
              className="absolute inset-0 animate-pulse bg-[var(--color-overlay)] motion-reduce:animate-none"
              data-book-loading-animation
            />
            <BookOpen className="relative h-8 w-8 text-[var(--color-primary)] sm:h-9 sm:w-9" />
          </div>
          <h1
            id="book-loading-heading"
            className="m-0 text-[var(--type-lg)] font-semibold text-[var(--color-on-surface)]"
          >
            Opening book&hellip;
          </h1>
        </div>
      </div>
    </main>
  );
}
