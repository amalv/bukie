import BookOpen from "lucide-react/dist/esm/icons/book-open.js";
import Calendar from "lucide-react/dist/esm/icons/calendar.js";
import User from "lucide-react/dist/esm/icons/user.js";
import Image from "next/image";
import * as s from "./BookDetails.css";
import { formatCount, formatOneDecimal } from "./rating";
import type { Book } from "./types";

export type BookDetailsProps = { book: Book };

// Temporary mock details for richer UI until DB fields are added
const DETAILS_MOCK: Record<
  string,
  Partial<Pick<Book, "description" | "pages" | "publisher" | "isbn">>
> = {
  "1": {
    description:
      "Between life and death there is a library, and within that library, the shelves go on forever. Every book provides a chance to try another life you could have lived. To see how things would be if you had made other choices... Would you have done anything different, if you had the chance to undo your regrets?",
    pages: 288,
    publisher: "Canongate Books",
    isbn: "978-1786892737",
  },
};

export function BookDetails({ book }: BookDetailsProps) {
  const mock = DETAILS_MOCK[book.id] ?? {};
  const about =
    book.description ??
    mock.description ??
    "Full details for this book will be available soon.";
  const pages = book.pages ?? mock.pages;
  const publisher = book.publisher ?? mock.publisher;
  const isbn = book.isbn ?? mock.isbn;

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
          <div className={s.rightCol}>
            <section className={s.meta}>
              <div className={s.headerRow}>
                <div>
                  <h1 id="book-title" className={s.title}>
                    {book.title}
                  </h1>
                  <p className={s.author}>
                    <User className={s.icon} aria-hidden="true" />
                    <span className={s.authorTextSpacing}>
                      by {book.author}
                    </span>
                  </p>
                </div>
                {book.genre ? (
                  <span className={s.badge}>{book.genre}</span>
                ) : null}
              </div>
              {(typeof book.rating === "number" ||
                book.year != null ||
                pages != null) && (
                <div className={s.info}>
                  {typeof book.rating === "number" ? (
                    <span className={s.stars}>
                      <span className={s.srOnly}>{`Rating ${formatOneDecimal(
                        book.rating,
                      )} out of 5${
                        typeof book.ratingsCount === "number"
                          ? ` based on ${formatCount(book.ratingsCount)} reviews`
                          : ""
                      }`}</span>
                      <SingleStarIcon />
                      <span className={s.iconTextSpacing}>
                        {formatOneDecimal(book.rating)}
                      </span>
                      {typeof book.ratingsCount === "number" ? (
                        <span className={s.iconTextSpacing}>
                          ({formatCount(book.ratingsCount)})
                        </span>
                      ) : null}
                    </span>
                  ) : null}
                  {book.year != null ? (
                    <span>
                      <Calendar className={s.icon} aria-hidden="true" />
                      <span className={s.iconTextSpacing}>{book.year}</span>
                    </span>
                  ) : null}
                  {pages != null ? (
                    <span>
                      <BookOpen className={s.icon} aria-hidden="true" />
                      <span className={s.iconTextSpacing}>{pages} pages</span>
                    </span>
                  ) : null}
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
      </div>
    </article>
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
