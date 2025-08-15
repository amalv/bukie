import Image from "next/image";
import Link from "next/link";
import type { ReactNode } from "react";
import * as s from "./BookCard.css";
import type { Book } from "./types";

export type BookCardProps = { book: Book };

export function BookCard({ book }: BookCardProps) {
  return (
    <div className={s.card}>
      <div className={s.media}>
        <Link
          href={`/books/${book.id}`}
          aria-label={`View details for ${book.title}`}
          className={s.link}
        >
          <Image
            src={book.cover}
            alt={`Cover of ${book.title} by ${book.author}`}
            width={120}
            height={180}
            className={s.image}
            unoptimized
          />
        </Link>
        <div className={s.mediaOverlay} />
        {book.genre ? <span className={s.badge}>{book.genre}</span> : null}
      </div>
      <h3 className={s.title}>
        <Link href={`/books/${book.id}`} className={s.link}>
          {book.title}
        </Link>
      </h3>
      <p className={s.author}>{book.author}</p>
      {(book.rating != null || book.year != null) && (
        <div className={s.meta}>
          {typeof book.rating === "number" ? (
            <>
              <span className={s.stars}>{renderStars(book.rating)}</span>
              <span>{book.rating.toFixed(1)}</span>
            </>
          ) : null}
          {book.year != null ? <span>• {book.year}</span> : null}
        </div>
      )}
    </div>
  );
}

function renderStars(value: number) {
  const clamped = Math.max(0, Math.min(5, value));
  const full = Math.floor(clamped);
  const half = clamped - full >= 0.5 ? 1 : 0;
  const empty = 5 - full - half;
  const icons: ReactNode[] = [];
  for (let i = 0; i < full; i++)
    icons.push(<Star key={`f-${i}`} variant="full" />);
  if (half) icons.push(<Star key="h" variant="half" />);
  for (let i = 0; i < empty; i++)
    icons.push(<Star key={`e-${i}`} variant="empty" />);
  return icons;
}

function Star({ variant }: { variant: "full" | "half" | "empty" }) {
  // Single path star; use fill/clip to represent half/empty
  const fill = variant === "empty" ? "none" : "currentColor";
  const defs = variant === "half";
  return (
    <svg viewBox="0 0 24 24" className={s.starIcon} aria-hidden="true">
      {defs ? (
        <defs>
          <linearGradient
            id="halfGrad"
            x1="0"
            y1="0"
            x2="24"
            y2="0"
            gradientUnits="userSpaceOnUse"
          >
            <stop offset="50%" stopColor="currentColor" />
            <stop offset="50%" stopColor="transparent" />
          </linearGradient>
        </defs>
      ) : null}
      <path
        d="M12 17.27 18.18 21l-1.64-7.03L22 9.24l-7.19-.61L12 2 9.19 8.63 2 9.24l5.46 4.73L5.82 21z"
        fill={variant === "half" ? "url(#halfGrad)" : fill}
        stroke="currentColor"
        strokeWidth="1"
      />
    </svg>
  );
}
