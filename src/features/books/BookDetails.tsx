import Image from "next/image";
import * as s from "./BookDetails.css";
import type { Book } from "./types";

export type BookDetailsProps = { book: Book };

export function BookDetails({ book }: BookDetailsProps) {
  return (
    <article className={s.page} aria-labelledby="book-title">
      <div className={s.layout}>
        <Image
          src={book.cover}
          alt={`Cover of ${book.title} by ${book.author}`}
          width={180}
          height={270}
          className={s.cover}
          unoptimized
        />
        <section className={s.meta}>
          <h1 id="book-title" className={s.title}>
            {book.title}
          </h1>
          <p className={s.author}>
            <span>by </span>
            <span>{book.author}</span>
          </p>
        </section>
      </div>
    </article>
  );
}
