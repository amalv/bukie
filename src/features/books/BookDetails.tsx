import Image from "next/image";
import type { ReactNode } from "react";
import * as s from "./BookDetails.css";
import type { Book } from "./types";

export type BookDetailsProps = { book: Book };

export function BookDetails({ book }: BookDetailsProps) {
  return (
    <article className={s.page} aria-labelledby="book-title">
      <div className={s.layout}>
        <div className={s.media}>
          <Image
            src={book.cover}
            alt={`Cover of ${book.title} by ${book.author}`}
            width={180}
            height={270}
            className={s.cover}
            unoptimized={
              process.env.NODE_ENV !== "production" ||
              book.cover.includes(".svg")
            }
            sizes="(max-width: 640px) 40vw, 180px"
          />
          {book.genre ? <span className={s.badge}>{book.genre}</span> : null}
        </div>
        <section className={s.meta}>
          <h1 id="book-title" className={s.title}>
            {book.title}
          </h1>
          <p className={s.author}>
            <span>by </span>
            <span>{book.author}</span>
          </p>
          {(book.rating != null || book.year != null) && (
            <div className={s.info}>
              {typeof book.rating === "number" ? (
                <span className={s.stars}>
                  <span
                    className={s.srOnly}
                  >{`Rating: ${book.rating.toFixed(1)} out of 5`}</span>
                  {renderStars(book.rating)}
                  <span style={{ marginLeft: 4 }}>
                    {book.rating.toFixed(1)}
                  </span>
                </span>
              ) : null}
              {book.year != null ? <span>{book.year}</span> : null}
            </div>
          )}
        </section>
      </div>
    </article>
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
  const fill = variant === "empty" ? "none" : "currentColor";
  const defs = variant === "half";
  return (
    <svg viewBox="0 0 24 24" className={s.starIcon} aria-hidden="true">
      {defs ? (
        <defs>
          <linearGradient
            id="halfGradDetails"
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
        fill={variant === "half" ? "url(#halfGradDetails)" : fill}
        stroke="currentColor"
        strokeWidth="1"
      />
    </svg>
  );
}
