import {
  isValidIsbn10,
  isValidIsbn13,
  normalizeIsbn,
} from "@/features/books/importer/validate";

export type PartialDate = {
  value: string;
  precision: "year" | "month" | "day";
  sortDate: string;
};

export function normalizeSortText(value: string): string {
  return value
    .normalize("NFKD")
    .replace(/\p{M}/gu, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

export function slugifyCatalogValue(value: string): string {
  return normalizeSortText(value).replaceAll(" ", "-");
}

export function parsePartialDate(value: string | number): PartialDate | null {
  const raw = String(value).trim();
  let match = /^(\d{4})$/.exec(raw);
  if (match) {
    return { value: raw, precision: "year", sortDate: `${raw}-01-01` };
  }

  match = /^(\d{4})-(\d{2})$/.exec(raw);
  if (match) {
    const month = Number(match[2]);
    if (month >= 1 && month <= 12) {
      return { value: raw, precision: "month", sortDate: `${raw}-01` };
    }
    return null;
  }

  match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(raw);
  if (!match) return null;
  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  const parsed = new Date(Date.UTC(year, month - 1, day));
  if (
    parsed.getUTCFullYear() !== year ||
    parsed.getUTCMonth() !== month - 1 ||
    parsed.getUTCDate() !== day
  ) {
    return null;
  }
  return { value: raw, precision: "day", sortDate: raw };
}

export function normalizeValidIsbn(
  value: string | null | undefined,
): { scheme: "isbn10" | "isbn13"; value: string } | null {
  const normalized = normalizeIsbn(value);
  if (!normalized) return null;
  if (isValidIsbn10(normalized)) return { scheme: "isbn10", value: normalized };
  if (isValidIsbn13(normalized)) return { scheme: "isbn13", value: normalized };
  return null;
}

export function isProviderNeutralCoverKey(value: string): boolean {
  return /^\/covers\/[a-zA-Z0-9][a-zA-Z0-9._/-]*$/.test(value);
}

export function isGeneratedLegacyDescription(input: {
  description?: string;
  genre?: string;
  author: string;
}): boolean {
  if (!input.description || !input.genre) return false;
  return (
    input.description ===
    `A notable ${input.genre.toLowerCase()} book by ${input.author}.`
  );
}
