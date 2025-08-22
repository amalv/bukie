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
        <Link
          href={`/books/${book.id}`}
          aria-label={`View details for ${book.title}`}
          className={s.mediaLink}
        >
          <Image
            src={book.cover}
            alt={`Cover of ${book.title} by ${book.author}`}
            width={400}
            height={600}
            className={s.image}
            // Keep unoptimized in dev/test for stability; enable optimization in prod for raster images
            unoptimized={
              process.env.NODE_ENV !== "production" ||
              book.cover.includes(".svg")
            }
            sizes="(max-width: 640px) 45vw, (max-width: 1024px) 22vw, 200px"
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
                    ({formatCount(book.ratingsCount)})
                  </span>
                ) : null}
              </span>
            ) : null}
            {book.year != null ? <span>{book.year}</span> : null}
          </div>
        )}
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
