import Image from "next/image";
import Link from "next/link";
import { shouldUnoptimizeImage } from "@/media/covers";
import {
  presentAuthors,
  presentBibliographicMeta,
  presentRating,
  type RatingPresentation,
} from "./presentation";
import type { Book } from "./types";

export type BookCardProps = {
  book: Book;
  presentation?: "grid" | "compact";
  ratingPresentation?: RatingPresentation;
};

export function BookCard({
  book,
  presentation = "grid",
  ratingPresentation,
}: BookCardProps) {
  const isCompact = presentation === "compact";
  const authors = presentAuthors(book);
  const bibliographicMeta = presentBibliographicMeta(book);
  const rating = presentRating(ratingPresentation);
  const coverSrc = book.cover?.trim() || "/covers/placeholder.svg";

  return (
    <article
      className={[
        "group book-card relative flex h-full min-w-0 rounded-[var(--radius-md)] border border-[color:var(--color-outline)] bg-[var(--color-surface)] shadow-[var(--elevation-1)] motion-safe:transition-[box-shadow,transform,border-color] motion-safe:duration-200 motion-safe:ease-out motion-safe:hover:-translate-y-[2px] motion-safe:hover:border-[color:var(--color-primary)] motion-safe:hover:shadow-[var(--elevation-3)]",
        isCompact ? "min-h-[132px] flex-row sm:min-h-[144px]" : "flex-col",
      ].join(" ")}
      data-presentation={presentation}
    >
      <div
        className={[
          "relative shrink-0 overflow-hidden bg-[var(--color-overlay)]",
          isCompact
            ? "h-[132px] w-[88px] rounded-l-[var(--radius-md)] sm:h-[144px] sm:w-[96px]"
            : "w-full rounded-t-[var(--radius-md)] aspect-[2/3]",
        ].join(" ")}
      >
        <Image
          src={coverSrc}
          alt=""
          fill
          sizes={
            isCompact
              ? "(min-width: 640px) 96px, 88px"
              : "(min-width: 1280px) 16vw, (min-width: 1024px) 25vw, (min-width: 640px) 33vw, 50vw"
          }
          className="absolute inset-0 block h-full w-full object-cover object-center motion-safe:transition-transform motion-safe:duration-300 motion-safe:ease-out motion-safe:group-hover:scale-105"
          unoptimized={shouldUnoptimizeImage(coverSrc)}
        />
      </div>
      <div
        className={[
          "flex min-w-0 flex-1 flex-col gap-[var(--spacing-0-5)] p-[var(--spacing-1-5)]",
          isCompact ? "justify-center" : "",
        ].join(" ")}
      >
        <h3 className="m-0 overflow-hidden text-left text-[var(--type-md)] leading-[var(--line-tight)] font-bold text-[var(--color-on-surface)] [display:-webkit-box] [-webkit-box-orient:vertical] [-webkit-line-clamp:2]">
          <Link
            href={`/books/${book.id}`}
            aria-label={`View details for ${book.title}`}
            className="text-inherit no-underline outline-none after:pointer-events-none after:absolute after:inset-0 after:rounded-[var(--radius-md)] focus-visible:text-[var(--color-primary)] focus-visible:after:outline-2 focus-visible:after:outline-offset-2 focus-visible:after:outline-[var(--color-primary)]"
          >
            {book.title}
          </Link>
        </h3>
        {authors ? (
          <p className="m-0 truncate text-left text-[var(--type-sm)] leading-[var(--line-normal)] text-[var(--color-on-surface)]">
            {authors.truncated ? (
              <>
                <span aria-hidden="true">{authors.visible}</span>
                <span className="sr-only">{authors.full}</span>
              </>
            ) : (
              authors.visible
            )}
          </p>
        ) : null}
        {bibliographicMeta ? (
          <p className="m-0 truncate text-left text-[var(--type-xs)] leading-[var(--line-normal)] text-[color:var(--color-on-surface)]">
            {bibliographicMeta}
          </p>
        ) : null}
        {rating ? (
          <p className="m-0 inline-flex min-h-5 items-center gap-[var(--spacing-0-5)] truncate text-left text-[var(--type-xs)] leading-[var(--line-normal)] text-[color:var(--color-on-surface)]">
            <span className="sr-only">{rating.accessible}</span>
            <span
              aria-hidden="true"
              className="inline-flex items-center gap-[var(--spacing-0-5)]"
            >
              {ratingPresentation?.state === "eligible" &&
              ratingPresentation.count > 0 ? (
                <SingleStarIcon />
              ) : null}
              {rating.visible}
            </span>
          </p>
        ) : null}
      </div>
    </article>
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
