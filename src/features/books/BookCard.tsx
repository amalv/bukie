import Image from "next/image";
import Link from "next/link";
import * as s from "./BookCard.css";
import type { Book } from "./types";

export type BookCardProps = { book: Book };

export function BookCard({ book }: BookCardProps) {
  return (
    <div className={s.card}>
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
      <h3 className={s.title}>
        <Link href={`/books/${book.id}`} className={s.link}>
          {book.title}
        </Link>
      </h3>
      <p className={s.author}>{book.author}</p>
    </div>
  );
}
