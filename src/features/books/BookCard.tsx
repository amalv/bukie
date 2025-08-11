import Image from "next/image";
import * as s from "./BookCard.css";
import type { Book } from "./types";

export type BookCardProps = { book: Book };

export function BookCard({ book }: BookCardProps) {
  return (
    <div className={s.card}>
      <Image
        src={book.cover}
        alt={`Cover of ${book.title} by ${book.author}`}
        width={120}
        height={180}
        className={s.image}
        priority
      />
      <h3 className={s.title}>{book.title}</h3>
      <p className={s.author}>{book.author}</p>
    </div>
  );
}
