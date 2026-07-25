import Image from "next/image";
import Link from "next/link";
import { shouldUnoptimizeImage } from "@/media/covers";
import { formatCount, formatOneDecimal } from "./rating";
import type { Book } from "./types";

export type BookCardProps = { book: Book };

export function BookCard({ book }: BookCardProps) {
  const hasMeta = book.rating != null || book.year != null;
  const hasDescription = Boolean(book.description?.trim());
  const coverSrc = book.cover?.trim() || "/covers/placeholder.svg";

  return (
    <div className="group book-card flex h-full flex-col overflow-hidden rounded-[var(--radius-md)] border border-[color:var(--color-outline)] bg-[var(--color-surface)] shadow-[var(--elevation-1)] transition-[box-shadow,transform,border-color] duration-200 ease-out hover:-translate-y-[2px] hover:border-[color:var(--color-primary)] hover:shadow-[var(--elevation-3)] focus-within:-translate-y-[2px] focus-within:border-[color:var(--color-primary)] focus-within:shadow-[var(--elevation-3)]">
      <div className="relative w-full overflow-hidden aspect-[2/3]">
        <Link
          href={`/books/${book.id}`}
          aria-label={`View details for ${book.title}`}
          className="absolute inset-0 block"
        >
          <Image
            src={coverSrc}
            alt={`Cover of ${book.title} by ${book.author}`}
            fill
            className="absolute inset-0 block h-full w-full object-cover object-center transition-transform duration-300 ease-out group-hover:scale-105"
            unoptimized={shouldUnoptimizeImage(coverSrc)}
          />
        </Link>
        <div className="pointer-events-none absolute inset-0 bg-transparent transition-colors duration-200 ease-out group-hover:bg-[var(--color-overlay)]" />
        {book.genre ? (
          <span className="book-card-badge absolute top-[var(--spacing-1)] right-[var(--spacing-1)] z-[1] rounded-[var(--radius-sm)] border border-[color:var(--color-outline)] bg-[var(--color-surface)] px-[var(--spacing-0-5)] py-px text-[var(--type-xs)] leading-[var(--line-tight)] text-[var(--color-on-surface)] shadow-[var(--elevation-1)]">
            {book.genre}
          </span>
        ) : null}
      </div>
      <div className="flex flex-1 translate-y-0 flex-col gap-px p-[var(--spacing-0-5)] transition-transform duration-200 ease-out group-hover:-translate-y-px">
        <div className="flex items-start gap-[var(--spacing-0-5)]">
          <h3 className="m-0 flex-1 overflow-hidden text-left text-[var(--type-md)] leading-[var(--line-tight)] font-bold text-[var(--color-on-surface)] transition-colors duration-200 ease-out [display:-webkit-box] [-webkit-box-orient:vertical] [-webkit-line-clamp:2] group-hover:text-[var(--color-primary)]">
            <Link
              href={`/books/${book.id}`}
              className="text-inherit no-underline outline-none focus-visible:text-[var(--color-primary)]"
            >
              {book.title}
            </Link>
          </h3>
          {typeof book.rating === "number" ? (
            <span className="mt-px inline-flex shrink-0 items-center gap-[var(--spacing-0-5)] text-[var(--type-xs)] text-[var(--color-on-surface)] opacity-70">
              <span className="sr-only">{`Rating ${formatOneDecimal(book.rating)} out of 5`}</span>
              <SingleStarIcon />
              <span aria-hidden="true">{formatOneDecimal(book.rating)}</span>
            </span>
          ) : null}
        </div>
        <p className="m-0 text-left text-[var(--type-xs)] leading-[var(--line-normal)] text-[var(--color-on-surface)] opacity-75">
          <span className="sr-only">{`by ${book.author}`}</span>
          <span aria-hidden="true">{book.author}</span>
        </p>
        {hasMeta ? (
          <div className="sr-only">
            {typeof book.rating === "number" &&
            typeof book.ratingsCount === "number"
              ? `(${formatCount(book.ratingsCount)} reviews)`
              : null}
            {book.year != null ? <span>{book.year}</span> : null}
          </div>
        ) : null}
        {hasDescription ? <p className="sr-only">{book.description}</p> : null}
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
