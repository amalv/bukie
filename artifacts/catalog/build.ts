import { createHash } from "node:crypto";
import { readdirSync } from "node:fs";
import { join } from "node:path";
import type { Book } from "@/features/books/types";

export type CuratedCatalogEntry = {
  title: string;
  authors: string[];
  year?: number;
  description?: string;
  isbn?: string;
  pages?: number;
  publisher?: string;
};

function slugify(value: string): string {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function hashString(value: string): number {
  let hash = 0;
  for (let index = 0; index < value.length; index += 1) {
    hash = (hash * 31 + value.charCodeAt(index)) >>> 0;
  }
  return hash >>> 0;
}

function buildDeterministicId(seed: string): string {
  const bytes = createHash("sha1").update(seed).digest().subarray(0, 16);
  bytes[6] = (bytes[6] & 0x0f) | 0x50;
  bytes[8] = (bytes[8] & 0x3f) | 0x80;

  const hex = bytes.toString("hex");
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(
    12,
    16,
  )}-${hex.slice(16, 20)}-${hex.slice(20, 32)}`;
}

function joinAuthors(authors: string[]): string {
  if (authors.length <= 1) return authors[0] ?? "";
  return authors.join(" & ");
}

function loadCoverFiles(): Set<string> {
  try {
    return new Set(readdirSync(join(process.cwd(), "public", "covers")));
  } catch {
    return new Set();
  }
}

const availableCoverFiles = loadCoverFiles();

function resolveCoverPath(id: string, title: string): string {
  const idOnlyFilename = `${id}.webp`;
  if (availableCoverFiles.has(idOnlyFilename)) {
    return `/covers/${idOnlyFilename}`;
  }

  const legacyFilename = `${id}-${slugify(title)}.webp`;
  if (availableCoverFiles.has(legacyFilename)) {
    return `/covers/${legacyFilename}`;
  }

  return "/covers/placeholder.svg";
}

export function buildCatalog(
  genre: string,
  entries: CuratedCatalogEntry[],
): Book[] {
  return entries.map((entry) => {
    const author = joinAuthors(entry.authors);
    const seed = `${genre}|${entry.title}|${author}`;
    const hash = hashString(seed);
    const id = buildDeterministicId(seed);

    return {
      id,
      title: entry.title,
      authors: entry.authors,
      author,
      cover: resolveCoverPath(id, entry.title),
      genre,
      rating: Number((3.6 + ((hash % 14) / 10)).toFixed(1)),
      ratingsCount: 200 + (hash % 24000),
      year: entry.year,
      description:
        entry.description ??
        `A notable ${genre.toLowerCase()} book by ${author}.`,
      isbn: entry.isbn,
      pages: entry.pages,
      publisher: entry.publisher,
    };
  });
}

export function combineCatalogs(...catalogs: Book[][]): Book[] {
  return catalogs.flat();
}
