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
  const bytes = sha1Bytes(seed).slice(0, 16);
  bytes[6] = (bytes[6] & 0x0f) | 0x50;
  bytes[8] = (bytes[8] & 0x3f) | 0x80;
  const hex = bytes.map((byte) => byte.toString(16).padStart(2, "0")).join("");
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(
    12,
    16,
  )}-${hex.slice(16, 20)}-${hex.slice(20, 32)}`;
}

function leftRotate(value: number, amount: number): number {
  return ((value << amount) | (value >>> (32 - amount))) >>> 0;
}

function sha1Bytes(value: string): number[] {
  const bytes = Array.from(new TextEncoder().encode(value));
  const bitLength = bytes.length * 8;
  bytes.push(0x80);

  while ((bytes.length % 64) !== 56) {
    bytes.push(0);
  }

  const highBits = Math.floor(bitLength / 0x100000000);
  const lowBits = bitLength >>> 0;
  bytes.push(
    (highBits >>> 24) & 0xff,
    (highBits >>> 16) & 0xff,
    (highBits >>> 8) & 0xff,
    highBits & 0xff,
    (lowBits >>> 24) & 0xff,
    (lowBits >>> 16) & 0xff,
    (lowBits >>> 8) & 0xff,
    lowBits & 0xff,
  );

  let h0 = 0x67452301;
  let h1 = 0xefcdab89;
  let h2 = 0x98badcfe;
  let h3 = 0x10325476;
  let h4 = 0xc3d2e1f0;

  for (let offset = 0; offset < bytes.length; offset += 64) {
    const words = new Array<number>(80);

    for (let index = 0; index < 16; index += 1) {
      const base = offset + index * 4;
      words[index] =
        (bytes[base] << 24) |
        (bytes[base + 1] << 16) |
        (bytes[base + 2] << 8) |
        bytes[base + 3];
    }

    for (let index = 16; index < 80; index += 1) {
      words[index] = leftRotate(
        words[index - 3] ^
          words[index - 8] ^
          words[index - 14] ^
          words[index - 16],
        1,
      );
    }

    let a = h0;
    let b = h1;
    let c = h2;
    let d = h3;
    let e = h4;

    for (let index = 0; index < 80; index += 1) {
      let f: number;
      let k: number;

      if (index < 20) {
        f = (b & c) | (~b & d);
        k = 0x5a827999;
      } else if (index < 40) {
        f = b ^ c ^ d;
        k = 0x6ed9eba1;
      } else if (index < 60) {
        f = (b & c) | (b & d) | (c & d);
        k = 0x8f1bbcdc;
      } else {
        f = b ^ c ^ d;
        k = 0xca62c1d6;
      }

      const temp =
        (leftRotate(a, 5) + f + e + k + (words[index] >>> 0)) >>> 0;
      e = d;
      d = c;
      c = leftRotate(b, 30);
      b = a;
      a = temp;
    }

    h0 = (h0 + a) >>> 0;
    h1 = (h1 + b) >>> 0;
    h2 = (h2 + c) >>> 0;
    h3 = (h3 + d) >>> 0;
    h4 = (h4 + e) >>> 0;
  }

  return [h0, h1, h2, h3, h4].flatMap((word) => [
    (word >>> 24) & 0xff,
    (word >>> 16) & 0xff,
    (word >>> 8) & 0xff,
    word & 0xff,
  ]);
}

function joinAuthors(authors: string[]): string {
  if (authors.length <= 1) return authors[0] ?? "";
  return authors.join(" & ");
}

function resolveCoverPath(id: string): string {
  return `/covers/${id}.webp`;
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
      cover: resolveCoverPath(id),
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
