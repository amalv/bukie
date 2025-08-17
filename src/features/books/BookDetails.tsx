import Image from "next/image";
import type { ReactNode } from "react";
import * as s from "./BookDetails.css";
import type { Book } from "./types";

export type BookDetailsProps = { book: Book };

export function BookDetails({ book }: BookDetailsProps) {
  // Optional fields may be missing; use values when present
  const about = book.description;
  const pages = book.pages;
  const publisher = book.publisher;
  const isbn = book.isbn;

  return (
    <article className={s.page} aria-labelledby="book-title">
      <div className={s.container}>
        <a href="/" className={s.backLink}>
          ← Back to Library
        </a>
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
          </div>
          <section className={s.meta}>
            <div className={s.headerRow}>
              <div>
                <h1 id="book-title" className={s.title}>
                  {book.title}
                </h1>
                <p className={s.author}>
                  <span>by </span>
                  <span>{book.author}</span>
                </p>
              </div>
              {book.genre ? (
                <span className={s.badge}>{book.genre}</span>
              ) : null}
            </div>
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
          <div className={s.sections}>
            {about ? (
              <section className={s.sectionCard}>
                <div className={s.sectionBody}>
                  <h2 className={s.sectionTitle}>About this book</h2>
                  <p className={s.muted}>{about}</p>
                </div>
              </section>
            ) : null}
            <section className={s.sectionCard}>
              <div className={s.sectionBody}>
                <h2 className={s.sectionTitle}>Book Details</h2>
                <div className={s.detailsGrid}>
                  <div>
                    <div className={s.label}>Author:</div>
                    <div className={s.muted}>{book.author}</div>
                  </div>
                  <div>
                    <div className={s.label}>Genre:</div>
                    <div className={s.muted}>{book.genre ?? "—"}</div>
                  </div>
                  <div>
                    <div className={s.label}>Publication Year:</div>
                    <div className={s.muted}>{book.year ?? "—"}</div>
                  </div>
                  {pages != null ? (
                    <div>
                      <div className={s.label}>Pages:</div>
                      <div className={s.muted}>{pages}</div>
                    </div>
                  ) : null}
                  {publisher ? (
                    <div>
                      <div className={s.label}>Publisher:</div>
                      <div className={s.muted}>{publisher}</div>
                    </div>
                  ) : null}
                  {isbn ? (
                    <div>
                      <div className={s.label}>ISBN:</div>
                      <div className={s.muted}>{isbn}</div>
                    </div>
                  ) : null}
                </div>
              </div>
            </section>
          </div>
        </div>
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
