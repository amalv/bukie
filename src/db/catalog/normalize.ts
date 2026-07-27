export type PartialDate = {
  value: string;
  precision: "year" | "month" | "day";
  sortDate: string;
};

/** Remove separators while preserving the ISBN-10 X check digit. */
export function normalizeIsbn(raw: string | null | undefined): string | null {
  if (!raw) return null;
  const cleaned = String(raw)
    .toUpperCase()
    .replace(/[^0-9X]/g, "");
  return cleaned || null;
}

export function isValidIsbn10(raw: string | null | undefined): boolean {
  const value = normalizeIsbn(raw);
  if (!value || value.length !== 10) return false;
  let sum = 0;
  for (let index = 0; index < 9; index += 1) {
    const character = value[index];
    if (character < "0" || character > "9") return false;
    sum += (10 - index) * (character.charCodeAt(0) - 48);
  }
  const check = value[9] === "X" ? 10 : value[9].charCodeAt(0) - 48;
  return check >= 0 && check <= 10 && (sum + check) % 11 === 0;
}

export function isValidIsbn13(raw: string | null | undefined): boolean {
  const value = normalizeIsbn(raw);
  if (!value || value.length !== 13) return false;
  let sum = 0;
  for (let index = 0; index < 12; index += 1) {
    const digit = value[index].charCodeAt(0) - 48;
    if (digit < 0 || digit > 9) return false;
    sum += digit * (index % 2 === 0 ? 1 : 3);
  }
  const expected = (10 - (sum % 10)) % 10;
  return value[12].charCodeAt(0) - 48 === expected;
}

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
