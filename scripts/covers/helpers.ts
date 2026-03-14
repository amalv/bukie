import type { Book } from "@/features/books/types";

type CoverLookupBook = Pick<Book, "title" | "author" | "isbn">;

type OpenLibrarySearchDoc = {
  title?: string;
  author_name?: string[];
  cover_i?: number;
  cover_edition_key?: string;
  edition_key?: string[];
  editions?: {
    docs?: Array<{
      key?: string;
    }>;
  };
};

type OpenLibrarySearchResponse = {
  docs?: OpenLibrarySearchDoc[];
};

const COVERS_BASE = "https://covers.openlibrary.org";
const SEARCH_BASE = "https://openlibrary.org/search.json";
const MANUAL_CANDIDATES: Record<string, string[]> = {
  [normalize("Slouching Towards Bethlehem")]: [
    ...buildCoverIdCandidates(419596),
    ...buildOlidCandidates("OL50580M"),
  ],
  [normalize("The ABC Murders")]: [
    ...buildCoverIdCandidates(14573514),
    ...buildOlidCandidates("OL50890407M"),
  ],
  [normalize("Mistborn: The Final Empire")]: [
    ...buildCoverIdCandidates(14658160),
    ...buildCoverIdCandidates(11329782),
    ...buildOlidCandidates("OL29600138M"),
  ],
  [normalize("Doctor Zhivago")]: [
    ...buildCoverIdCandidates(14896503),
    ...buildOlidCandidates("OL58633171M"),
    ...buildCoverIdCandidates(1045432),
    ...buildOlidCandidates("OL9058491M"),
  ],
  [normalize("Don Quixote")]: [...buildCoverIdCandidates(14428305)],
  [normalize("The Girl Who Kicked the Hornets' Nest")]: [
    ...buildCoverIdCandidates(8352108),
    ...buildOlidCandidates("OL23991536M"),
  ],
  [normalize("The Wager")]: [
    ...buildCoverIdCandidates(13245246),
    ...buildOlidCandidates("OL39451844M"),
  ],
  [normalize("The Omnivore's Dilemma")]: [
    ...buildCoverIdCandidates(8596706),
    ...buildOlidCandidates("OL3431041M"),
  ],
  [normalize("The Trial")]: [
    ...buildCoverIdCandidates(997423),
    ...buildOlidCandidates("OL9019142M"),
    ...buildCoverIdCandidates(7742138),
  ],
  [normalize("The Castle")]: [
    ...buildCoverIdCandidates(12605605),
    ...buildOlidCandidates("OL7461641M"),
    ...buildCoverIdCandidates(14891120),
    ...buildOlidCandidates("OL50985845M"),
  ],
};
const SEARCH_OVERRIDES: Record<string, Partial<CoverLookupBook>> = {
  [normalize("Slouching Towards Bethlehem")]: {
    title: "Slouching Toward Bethlehem",
  },
  [normalize("The ABC Murders")]: {
    title: "The A.B.C. Murders",
  },
  [normalize("Mistborn: The Final Empire")]: {
    title: "The Final Empire",
  },
  [normalize("The Omnivore's Dilemma")]: {
    title: "The Omnivore's Dilemma: A Natural History of Four Meals",
  },
};

function normalize(value: string | undefined): string {
  return (value ?? "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

function unique(values: string[]): string[] {
  return [...new Set(values)];
}

function applySearchOverrides(book: CoverLookupBook): CoverLookupBook {
  const override = SEARCH_OVERRIDES[normalize(book.title)];
  return override ? { ...book, ...override } : book;
}

function buildCoverIdCandidates(coverId: number): string[] {
  return [
    `${COVERS_BASE}/b/id/${coverId}-L.jpg?default=false`,
    `${COVERS_BASE}/b/id/${coverId}-M.jpg?default=false`,
  ];
}

function buildOlidCandidates(olid: string): string[] {
  return [
    `${COVERS_BASE}/b/olid/${olid}-L.jpg?default=false`,
    `${COVERS_BASE}/b/olid/${olid}-M.jpg?default=false`,
  ];
}

function isLikelyMatch(book: CoverLookupBook, doc: OpenLibrarySearchDoc): boolean {
  const wantedTitle = normalize(book.title);
  const wantedAuthor = normalize(book.author);
  const docTitle = normalize(doc.title);
  const docAuthor = normalize(doc.author_name?.[0]);

  const titleMatches = docTitle === wantedTitle || docTitle.includes(wantedTitle) || wantedTitle.includes(docTitle);
  const authorMatches = !wantedAuthor || !docAuthor || docAuthor.includes(wantedAuthor) || wantedAuthor.includes(docAuthor);

  return titleMatches && authorMatches;
}

export function getOpenLibraryHeaders(): HeadersInit {
  return {
    "User-Agent":
      process.env.OPEN_LIBRARY_USER_AGENT ??
      "Bukie/1.0 (https://github.com/amalv/bukie)",
  };
}

export function buildOpenLibraryCandidates(book: CoverLookupBook): string[] {
  const urls: string[] = [];
  if (book.isbn) {
    const clean = book.isbn.replace(/[^0-9Xx]/g, "");
    urls.push(`${COVERS_BASE}/b/isbn/${clean}-L.jpg?default=false`);
    urls.push(`${COVERS_BASE}/b/isbn/${clean}-M.jpg?default=false`);
  }
  return urls;
}

export function extractOpenLibrarySearchCandidates(
  book: CoverLookupBook,
  payload: OpenLibrarySearchResponse,
): string[] {
  const docs = Array.isArray(payload.docs) ? payload.docs : [];
  const matches = docs.filter((doc) => isLikelyMatch(book, doc));
  const fallbackDocs = matches.length > 0 ? matches : docs.slice(0, 3);
  const urls: string[] = [];

  for (const doc of fallbackDocs) {
    if (typeof doc.cover_i === "number") {
      urls.push(...buildCoverIdCandidates(doc.cover_i));
    }

    const nestedEditionKeys = (doc.editions?.docs ?? [])
      .map((edition) => edition.key)
      .filter(Boolean)
      .slice(0, 5) as string[];

    const editionKeys = [
      doc.cover_edition_key,
      ...(doc.edition_key ?? []).slice(0, 5),
      ...nestedEditionKeys,
    ].filter(Boolean) as string[];

    for (const editionKey of editionKeys) {
      const olid = editionKey.replace(/^\/books\//, "");
      if (olid) urls.push(...buildOlidCandidates(olid));
    }
  }

  return unique(urls);
}

export async function findOpenLibraryCandidates(
  book: CoverLookupBook,
  fetchImpl: typeof fetch = fetch,
): Promise<string[]> {
  const isbnCandidates = buildOpenLibraryCandidates(book);
  const manualCandidates = MANUAL_CANDIDATES[normalize(book.title)] ?? [];
  if (!book.title) return unique([...isbnCandidates, ...manualCandidates]);
  const lookupBook = applySearchOverrides(book);

  const fetchSearchCandidates = async (author?: string): Promise<string[]> => {
    const url = new URL(SEARCH_BASE);
    url.searchParams.set("title", lookupBook.title);
    if (author) url.searchParams.set("author", author);
    url.searchParams.set("limit", "5");
    url.searchParams.set(
      "fields",
      "title,author_name,cover_i,cover_edition_key,edition_key,editions",
    );

    const response = await fetchImpl(url, {
      headers: getOpenLibraryHeaders(),
    });

    if (!response.ok) return [];

    const payload = (await response.json()) as OpenLibrarySearchResponse;
    return extractOpenLibrarySearchCandidates(lookupBook, payload);
  };

  try {
    const authorCandidates = await fetchSearchCandidates(lookupBook.author);
    const titleOnlyCandidates =
      authorCandidates.length > 0 ? [] : await fetchSearchCandidates();

    return unique([
      ...isbnCandidates,
      ...manualCandidates,
      ...authorCandidates,
      ...titleOnlyCandidates,
    ]);
  } catch {
    return unique([...isbnCandidates, ...manualCandidates]);
  }
}
