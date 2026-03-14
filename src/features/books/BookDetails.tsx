import BookOpen from "lucide-react/dist/esm/icons/book-open.js";
import Calendar from "lucide-react/dist/esm/icons/calendar.js";
import User from "lucide-react/dist/esm/icons/user.js";
import Image from "next/image";
import { useId } from "react";
import { formatCount, formatOneDecimal } from "./rating";
import type { Book } from "./types";

export type BookDetailsProps = { book: Book };

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
    <article
      className="block bg-[var(--color-background)] px-[var(--spacing-3)] py-[var(--spacing-3)] text-[var(--color-on-background)]"
      aria-labelledby="book-title"
    >
      <div className="mx-auto max-w-[1200px]">
        <a
          href="/"
          className="mb-[var(--spacing-2)] inline-flex items-center gap-[var(--spacing-1)] text-[var(--color-on-surface)] no-underline opacity-90 transition-colors hover:text-[var(--color-primary)] focus-visible:text-[var(--color-primary)]"
        >
          &larr; Back to Library
        </a>
        <div className="grid grid-cols-1 items-start gap-[var(--spacing-3)] md:grid-cols-[auto_1fr] md:gap-[var(--spacing-4)]">
          <div className="relative h-[270px] w-[180px] md:h-[540px] md:w-[360px]">
            <Image
              src={book.cover}
              alt={`Cover of ${book.title} by ${book.author}`}
              width={180}
              height={270}
              className="mt-[var(--spacing-2)] h-full w-full rounded-[var(--radius-md)] object-cover shadow-[var(--elevation-1)]"
              unoptimized={
                process.env.NODE_ENV !== "production" ||
                book.cover.includes(".svg")
              }
              sizes="(max-width: 640px) 40vw, 180px"
            />
          </div>
          <div className="flex flex-col gap-[var(--spacing-3)]">
            <section className="flex flex-col gap-[var(--spacing-1)]">
              <div className="mb-[var(--spacing-2)] flex items-start justify-between gap-[var(--spacing-2)]">
                <div>
                  <h1
                    id={useId()}
                    className="m-0 mb-[var(--spacing-1)] text-[var(--type-xl)] leading-[var(--line-tight)] font-semibold text-[var(--color-on-surface)]"
                  >
                    {book.title}
                  </h1>
                  <p className="m-0 text-[var(--type-md)] text-[var(--color-on-surface)] opacity-80">
                    <User
                      className="inline-block h-4 w-4 text-[var(--color-on-surface)] opacity-80"
                      aria-hidden="true"
                    />
                    <span className="ml-1.5">by {book.author}</span>
                  </p>
                </div>
                {book.genre ? (
                  <span className="rounded-[var(--radius-md)] border border-[color:var(--color-outline)] bg-[var(--color-surface)] px-[var(--spacing-1)] py-[var(--spacing-0-5)] text-[var(--type-xs)] leading-[var(--line-tight)] text-[var(--color-on-surface)] shadow-[var(--elevation-1)]">
                    {book.genre}
                  </span>
                ) : null}
              </div>
              {(typeof book.rating === "number" ||
                book.year != null ||
                pages != null) && (
                <div className="flex flex-wrap items-center gap-[var(--spacing-2)] text-[var(--type-sm)] text-[var(--color-on-surface)]">
                  {typeof book.rating === "number" ? (
                    <span className="inline-flex items-center gap-1">
                      <span className="sr-only">{`Rating ${formatOneDecimal(
                        book.rating,
                      )} out of 5${
                        typeof book.ratingsCount === "number"
                          ? ` based on ${formatCount(book.ratingsCount)} reviews`
                          : ""
                      }`}</span>
                      <SingleStarIcon />
                      <span className="ml-1">
                        {formatOneDecimal(book.rating)}
                      </span>
                      {typeof book.ratingsCount === "number" ? (
                        <span className="ml-1 opacity-80">
                          ({formatCount(book.ratingsCount)})
                        </span>
                      ) : null}
                    </span>
                  ) : null}
                  {book.year != null ? (
                    <span>
                      <Calendar
                        className="inline-block h-4 w-4 text-[var(--color-on-surface)] opacity-80"
                        aria-hidden="true"
                      />
                      <span className="ml-1">{book.year}</span>
                    </span>
                  ) : null}
                  {pages != null ? (
                    <span>
                      <BookOpen
                        className="inline-block h-4 w-4 text-[var(--color-on-surface)] opacity-80"
                        aria-hidden="true"
                      />
                      <span className="ml-1">{pages} pages</span>
                    </span>
                  ) : null}
                </div>
              )}
            </section>
            <div className="mt-[var(--spacing-3)] flex flex-col gap-[var(--spacing-3)] md:mt-0">
              {about ? (
                <section className="rounded-[var(--radius-lg)] border border-[color:var(--color-outline)] bg-[var(--color-surface)] text-[var(--color-on-surface)] shadow-[var(--elevation-1)]">
                  <div className="p-[var(--spacing-3)] md:p-[var(--spacing-4)]">
                    <h2 className="m-0 mb-[var(--spacing-2)] text-[var(--type-lg)] leading-[var(--line-normal)] font-semibold text-[var(--color-on-surface)]">
                      About this book
                    </h2>
                    <p className="m-0 text-[var(--type-sm)] leading-[var(--line-relaxed)] opacity-80">
                      {about}
                    </p>
                  </div>
                </section>
              ) : null}
              <section className="rounded-[var(--radius-lg)] border border-[color:var(--color-outline)] bg-[var(--color-surface)] text-[var(--color-on-surface)] shadow-[var(--elevation-1)]">
                <div className="p-[var(--spacing-3)] md:p-[var(--spacing-4)]">
                  <h2 className="m-0 mb-[var(--spacing-2)] text-[var(--type-lg)] leading-[var(--line-normal)] font-semibold text-[var(--color-on-surface)]">
                    Book Details
                  </h2>
                  <div className="grid grid-cols-1 gap-[var(--spacing-2)] md:grid-cols-2">
                    <div>
                      <div className="mb-[var(--spacing-0-5)] text-[var(--type-sm)] font-semibold">
                        Author:
                      </div>
                      <div className="text-[var(--type-sm)] opacity-80">
                        {book.author}
                      </div>
                    </div>
                    <div>
                      <div className="mb-[var(--spacing-0-5)] text-[var(--type-sm)] font-semibold">
                        Genre:
                      </div>
                      <div className="text-[var(--type-sm)] opacity-80">
                        {book.genre ?? "-"}
                      </div>
                    </div>
                    <div>
                      <div className="mb-[var(--spacing-0-5)] text-[var(--type-sm)] font-semibold">
                        Publication Year:
                      </div>
                      <div className="text-[var(--type-sm)] opacity-80">
                        {book.year ?? "-"}
                      </div>
                    </div>
                    {pages != null ? (
                      <div>
                        <div className="mb-[var(--spacing-0-5)] text-[var(--type-sm)] font-semibold">
                          Pages:
                        </div>
                        <div className="text-[var(--type-sm)] opacity-80">
                          {pages}
                        </div>
                      </div>
                    ) : null}
                    {publisher ? (
                      <div>
                        <div className="mb-[var(--spacing-0-5)] text-[var(--type-sm)] font-semibold">
                          Publisher:
                        </div>
                        <div className="text-[var(--type-sm)] opacity-80">
                          {publisher}
                        </div>
                      </div>
                    ) : null}
                    {isbn ? (
                      <div>
                        <div className="mb-[var(--spacing-0-5)] text-[var(--type-sm)] font-semibold">
                          ISBN:
                        </div>
                        <div className="text-[var(--type-sm)] opacity-80">
                          {isbn}
                        </div>
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
    <svg
      viewBox="0 0 24 24"
      className="book-details-star-icon inline-block h-[14px] w-[14px] text-[var(--color-star)]"
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
