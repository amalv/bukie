import Image from "next/image";
import Link from "next/link";
import { formatCount, formatOneDecimal } from "./rating";
import type { Book } from "./types";

export type BookCardProps = { book: Book };

export function BookCard({ book }: BookCardProps) {
  return (
    <div className="group book-card flex h-full flex-col overflow-hidden rounded-[var(--radius-md)] border border-[color:var(--color-outline)] bg-[var(--color-surface)] shadow-[var(--elevation-1)] transition-[box-shadow,transform,border-color] duration-200 ease-out hover:-translate-y-[2px] hover:border-[color:var(--color-primary)] hover:shadow-[var(--elevation-3)] focus-within:-translate-y-[2px] focus-within:border-[color:var(--color-primary)] focus-within:shadow-[var(--elevation-3)]">
      <div className="relative h-[176px] w-full overflow-hidden sm:h-[196px] md:h-[220px] xl:h-[240px]">
        {/* Floating favorite icon for visual parity with expected design; non-functional placeholder */}
        <div
          className="pointer-events-none absolute top-[var(--spacing-1)] left-[var(--spacing-1)] z-[1] inline-flex h-[34px] w-[34px] items-center justify-center rounded-full border border-[color:var(--color-outline)] bg-[var(--color-surface)] text-[var(--color-on-surface)] shadow-[var(--elevation-1)] transition-[transform,box-shadow] duration-150 ease-out group-hover:scale-105 group-hover:shadow-[var(--elevation-2)]"
          aria-hidden="true"
        >
          <svg
            viewBox="0 0 24 24"
            className="h-[18px] w-[18px]"
            aria-hidden="true"
            focusable="false"
          >
            <path
              d="M12 21s-1-.55-2.35-1.63C6.4 16.85 4 14.73 4 11.9 4 9.79 5.7 8 7.8 8c1.12 0 2.2.52 2.9 1.34.7-.82 1.78-1.34 2.9-1.34 2.1 0 3.8 1.79 3.8 3.9 0 2.83-2.4 4.95-5.65 7.47C13 20.45 12 21 12 21z"
              fill="currentColor"
            />
          </svg>
        </div>
        <Link
          href={`/books/${book.id}`}
          aria-label={`View details for ${book.title}`}
          className="relative block h-full w-full"
        >
          <Image
            src={book.cover?.trim() ? book.cover : "/covers/placeholder.svg"}
            alt={`Cover of ${book.title} by ${book.author}`}
            // Use fill to let the image fill the media container and use object-fit to preserve aspect ratio.
            fill
            className="absolute inset-0 block h-full w-full object-cover object-center transition-transform duration-300 ease-out group-hover:scale-105"
            // Keep unoptimized in dev/test for stability; enable optimization in prod for raster images
            unoptimized={
              process.env.NODE_ENV !== "production" ||
              book.cover?.includes(".svg") === true
            }
          />
        </Link>
        <div className="pointer-events-none absolute inset-0 bg-transparent transition-colors duration-200 ease-out group-hover:bg-[var(--color-overlay)]" />
        {book.genre ? (
          <span className="book-card-badge absolute top-[var(--spacing-1)] right-[var(--spacing-1)] z-[1] rounded-[var(--radius-md)] border border-[color:var(--color-outline)] bg-[var(--color-surface)] px-[var(--spacing-1)] py-[var(--spacing-0-5)] text-[var(--type-xs)] leading-[var(--line-tight)] text-[var(--color-on-surface)] shadow-[var(--elevation-1)]">
            {book.genre}
          </span>
        ) : null}
      </div>
      <div className="flex flex-1 translate-y-0 flex-col gap-[var(--spacing-1)] p-[var(--spacing-1-5)] transition-transform duration-200 ease-out group-hover:-translate-y-px">
        <h3 className="m-0 mb-[var(--spacing-0-5)] overflow-hidden text-left text-[var(--type-lg)] leading-[var(--line-normal)] font-bold text-[var(--color-on-surface)] transition-colors duration-200 ease-out [display:-webkit-box] [-webkit-box-orient:vertical] [-webkit-line-clamp:2] group-hover:text-[var(--color-primary)]">
          <Link
            href={`/books/${book.id}`}
            className="text-inherit no-underline outline-none focus-visible:text-[var(--color-primary)]"
          >
            {book.title}
          </Link>
        </h3>
        <p className="m-0 text-left text-[var(--type-sm)] leading-[var(--line-normal)] text-[var(--color-on-surface)] opacity-90">
          by {book.author}
        </p>
        {(book.rating != null || book.year != null) && (
          <div className="book-card-meta mt-[var(--spacing-0-5)] flex items-center gap-[var(--spacing-1)] text-[var(--type-xs)] text-[var(--color-on-surface)] opacity-85">
            {typeof book.rating === "number" ? (
              <span className="inline-flex items-center gap-[var(--spacing-0-5)]">
                <span className="sr-only">{`Rating ${formatOneDecimal(book.rating)} out of 5${
                  typeof book.ratingsCount === "number"
                    ? ` based on ${formatCount(book.ratingsCount)} reviews`
                    : ""
                }`}</span>
                <SingleStarIcon />
                <span>{formatOneDecimal(book.rating)}</span>
                {typeof book.ratingsCount === "number" ? (
                  <span className="text-[var(--type-xs)] opacity-80">
                    ({formatCount(book.ratingsCount)} reviews)
                  </span>
                ) : null}
              </span>
            ) : null}
            {book.year != null ? <span>{book.year}</span> : null}
          </div>
        )}
        {book.description && book.description.trim() !== "" ? (
          <p className="m-0 overflow-hidden text-[var(--type-sm)] leading-[var(--line-relaxed)] text-[var(--color-on-surface)] opacity-85 [display:-webkit-box] [-webkit-box-orient:vertical] [-webkit-line-clamp:2]">
            {book.description}
          </p>
        ) : null}
        {/* Actions row to match expected UI. These are simple links/buttons; routing kept server-friendly */}
        <div className="mt-auto flex flex-wrap items-center gap-[var(--spacing-1)] pt-[var(--spacing-1)]">
          <Link
            href={`/books/${book.id}/add`}
            className="inline-flex min-h-[36px] items-center justify-center rounded-[var(--radius-md)] border border-[color:var(--color-primary)] bg-[var(--color-primary)] px-[var(--spacing-2)] py-[var(--spacing-1)] text-[var(--type-sm)] leading-[var(--line-normal)] font-semibold whitespace-nowrap text-[var(--color-on-primary)] no-underline shadow-[var(--elevation-1)] transition-shadow duration-150 ease-out hover:shadow-[var(--elevation-2)] focus-visible:shadow-[var(--elevation-3)] focus-visible:outline-none"
          >
            Add to Library
          </Link>
          <Link
            href={`/books/${book.id}/preview`}
            className="inline-flex min-h-[36px] items-center justify-center rounded-[var(--radius-md)] border border-[color:var(--color-outline)] bg-transparent px-[var(--spacing-2)] py-[var(--spacing-1)] text-[var(--type-sm)] leading-[var(--line-normal)] font-semibold whitespace-nowrap text-[var(--color-on-surface)] no-underline transition-colors duration-150 ease-out hover:bg-[var(--color-overlay)] focus-visible:shadow-[inset_0_0_0_2px_var(--color-primary)] focus-visible:outline-none"
          >
            Preview
          </Link>
        </div>
      </div>
    </div>
  );
}

function SingleStarIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      className="book-card-star-icon inline-block h-[14px] w-[14px] text-[var(--color-star)]"
      aria-hidden="true"
    >
      <path
        d="M12 17.27 18.18 21l-1.64-7.03L22 9.24l-7.19-.61L12 2 9.19 8.63 2 9.24l5.46 4.73L5.82 21z"
        fill="currentColor"
        stroke="currentColor"
        strokeWidth="1"
      />
    </svg>
  );
}
