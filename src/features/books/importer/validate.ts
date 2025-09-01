// Minimal validation and normalization helpers for the batch importer.

/** Remove non ISBN chars, keep digits and X (for ISBN-10). Uppercase X. */
export function normalizeIsbn(raw: string | null | undefined): string | null {
  if (!raw) return null;
  const cleaned = String(raw)
    .toUpperCase()
    .replace(/[^0-9X]/g, "");
  return cleaned || null;
}

export function isValidIsbn10(raw: string | null | undefined): boolean {
  const s = normalizeIsbn(raw);
  if (!s || s.length !== 10) return false;
  let sum = 0;
  for (let i = 0; i < 9; i++) {
    const c = s[i];
    if (c < "0" || c > "9") return false;
    sum += (10 - i) * (c.charCodeAt(0) - 48);
  }
  const check = s[9] === "X" ? 10 : s[9].charCodeAt(0) - 48;
  if (check < 0 || check > 10) return false;
  sum += check;
  return sum % 11 === 0;
}

export function isValidIsbn13(raw: string | null | undefined): boolean {
  const s = normalizeIsbn(raw);
  if (!s || s.length !== 13) return false;
  let sum = 0;
  for (let i = 0; i < 12; i++) {
    const digit = s[i].charCodeAt(0) - 48;
    if (digit < 0 || digit > 9) return false;
    sum += digit * (i % 2 === 0 ? 1 : 3);
  }
  const checkDigit = (10 - (sum % 10)) % 10;
  const last = s[12].charCodeAt(0) - 48;
  return last === checkDigit;
}

/** Prefer ISBN-13, then ISBN-10, then try free-form isbn field by length. */
export function chooseIsbn(
  isbn13?: string | null,
  isbn10?: string | null,
  isbn?: string | null,
): string | null {
  const c13 = normalizeIsbn(isbn13);
  if (c13) return c13;
  const c10 = normalizeIsbn(isbn10);
  if (c10) return c10;
  const cf = normalizeIsbn(isbn);
  if (cf && (cf.length === 10 || cf.length === 13)) return cf;
  return null;
}

/**
 * Normalize authors into a single display string for current schema.
 * - string => trimmed as-is
 * - string[] => join with " & " for two authors, otherwise ", "
 */
export function normalizeAuthor(
  input: string | string[] | null | undefined,
): string {
  if (!input) return "";
  if (Array.isArray(input)) {
    const cleaned = input.map((s) => (s ?? "").trim()).filter(Boolean);
    if (cleaned.length === 0) return "";
    if (cleaned.length === 1) return cleaned[0];
    if (cleaned.length === 2) return `${cleaned[0]} & ${cleaned[1]}`;
    return cleaned.join(", ");
  }
  return String(input).trim();
}
