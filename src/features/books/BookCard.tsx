import Image from "next/image";
import Link from "next/link";
import * as s from "./BookCard.css";
import { formatCount, formatOneDecimal } from "./rating";
import type { Book } from "./types";

export type BookCardProps = { book: Book };

export function BookCard({ book }: BookCardProps) {
  return (
    <div className={s.card}>
      <div className={s.media}>
        {/* Floating favorite icon for visual parity with expected design; non-functional placeholder */}
        <div className={s.iconButton} aria-hidden="true">
          <svg
            viewBox="0 0 24 24"
            className={s.heartIcon}
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
          className={s.mediaLink}
        >
          <Image
            src={book.cover?.trim() ? book.cover : "/covers/placeholder.webp"}
            alt={`Cover of ${book.title} by ${book.author}`}
            // Large intrinsic size; CSS controls the fixed height crop
            width={1600}
            height={900}
            className={s.image}
            // Keep unoptimized in dev/test for stability; enable optimization in prod for raster images
            unoptimized={
              process.env.NODE_ENV !== "production" ||
              book.cover?.includes(".svg") === true
            }
            sizes="(max-width: 640px) 50vw, (max-width: 1024px) 25vw, 240px"
          />
        </Link>
        <div className={s.mediaOverlay} />
        {book.genre ? <span className={s.badge}>{book.genre}</span> : null}
      </div>
      <div className={s.body}>
        <h3 className={s.title}>
          <Link href={`/books/${book.id}`} className={s.link}>
            {book.title}
          </Link>
        </h3>
        <p className={s.author}>by {book.author}</p>
        {(book.rating != null || book.year != null) && (
          <div className={s.meta}>
            {typeof book.rating === "number" ? (
              <span className={s.ratingRow}>
                <span
                  className={s.srOnly}
                >{`Rating ${formatOneDecimal(book.rating)} out of 5${
                  typeof book.ratingsCount === "number"
                    ? ` based on ${formatCount(book.ratingsCount)} reviews`
                    : ""
                }`}</span>
                <SingleStarIcon />
                <span>{formatOneDecimal(book.rating)}</span>
                {typeof book.ratingsCount === "number" ? (
                  <span className={s.ratingsCount}>
                    ({formatCount(book.ratingsCount)} reviews)
                  </span>
                ) : null}
              </span>
            ) : null}
            {book.year != null ? <span>{book.year}</span> : null}
          </div>
        )}
        {book.description && book.description.trim() !== "" ? (
          <p className={s.description}>{book.description}</p>
        ) : null}
        {/* Actions row to match expected UI. These are simple links/buttons; routing kept server-friendly */}
        <div className={s.actions}>
          <Link href={`/books/${book.id}`} className={s.primaryButton}>
            Add to Library
          </Link>
          <Link href={`/books/${book.id}`} className={s.secondaryButton}>
            Preview
          </Link>
        </div>
      </div>
    </div>
  );
}

function SingleStarIcon() {
  return (
    <svg viewBox="0 0 24 24" className={s.starIcon} aria-hidden="true">
      <path
        d="M12 17.27 18.18 21l-1.64-7.03L22 9.24l-7.19-.61L12 2 9.19 8.63 2 9.24l5.46 4.73L5.82 21z"
        fill="currentColor"
        stroke="currentColor"
        strokeWidth="1"
      />
    </svg>
  );
}
