import { formatCount, formatOneDecimal } from "./rating";
import type { Book } from "./types";

export type RatingPresentation =
  | {
      state: "eligible";
      average: number;
      count: number;
    }
  | {
      state: "unrated";
    }
  | {
      state: "unavailable";
    };

export type AuthorPresentation = {
  full: string;
  visible: string;
  truncated: boolean;
};

export type TextPresentation = {
  accessible: string;
  visible: string;
};

export function presentAuthors(book: Book): AuthorPresentation | undefined {
  const names = (book.authors?.length ? book.authors : [book.author])
    .map((name) => name?.trim())
    .filter((name): name is string => Boolean(name));

  if (names.length === 0) return undefined;

  const visibleNames = names.slice(0, 2);
  const hiddenCount = names.length - visibleNames.length;

  return {
    full: names.join(", "),
    visible:
      hiddenCount > 0
        ? `${visibleNames.join(" · ")} and ${hiddenCount} more`
        : visibleNames.join(" · "),
    truncated: hiddenCount > 0,
  };
}

export function presentBibliographicMeta(book: Book): string | undefined {
  const values = [
    book.genre?.trim() || undefined,
    book.year != null ? String(book.year) : undefined,
  ].filter((value): value is string => Boolean(value));

  return values.length > 0 ? values.join(" · ") : undefined;
}

export function presentRating(
  rating: RatingPresentation | undefined,
): TextPresentation | undefined {
  if (!rating) return undefined;

  if (rating.state === "unrated") {
    return { accessible: "Not rated", visible: "Not rated" };
  }

  if (rating.state === "unavailable") {
    return {
      accessible: "Rating unavailable",
      visible: "Rating unavailable",
    };
  }

  if (rating.count <= 0) {
    return { accessible: "Not rated", visible: "Not rated" };
  }

  const average = formatOneDecimal(rating.average);
  const count = formatCount(rating.count);

  return {
    accessible: `Rating ${average} out of 5 from ${count} ratings`,
    visible: `${average} · ${count} ratings`,
  };
}
