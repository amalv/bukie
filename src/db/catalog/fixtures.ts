import type { CatalogImportRecord } from "./importer";
import type { ResolutionCandidate } from "./resolver";

const sourceKey = "legacy_catalog" as const;

export const ADR_REPRESENTATIVE_RECORDS: CatalogImportRecord[] = [
  {
    sourceKey,
    recordKey: "adr-case-01",
    title: "The Quiet Orbit",
    authors: [{ name: "Mira Vale", key: "mira-vale" }],
    categories: [{ label: "Science Fiction", isPrimary: true }],
    isbn: "9780441172719",
    coverObjectKey: "/covers/adr-shared.webp",
  },
  {
    sourceKey,
    recordKey: "adr-case-02",
    title: "A River in Two Voices",
    authors: [
      { name: "Noah Reed", key: "noah-reed" },
      { name: "Iris Stone", key: "iris-stone" },
    ],
    categories: [{ label: "Classics", isPrimary: true }],
  },
  {
    sourceKey,
    recordKey: "adr-case-03",
    title: "The Cartographer's Lantern",
    authors: [{ name: "Sana North", key: "sana-north" }],
    categories: [
      { label: "Fantasy", isPrimary: true },
      { label: "Mystery & Thriller" },
      { label: "Classics" },
    ],
  },
  {
    sourceKey,
    recordKey: "adr-case-04-hardcover",
    workKey: "adr-verified-work-04",
    title: "Glass Harbors",
    authors: [{ name: "Tomas Grey", key: "tomas-grey" }],
    categories: [{ label: "Fantasy", isPrimary: true }],
    format: "hardcover",
    languages: [{ tag: "en", label: "English" }],
    publishers: [{ name: "North Quay Press", key: "north-quay" }],
    publicationDate: "2001-04-12",
    pages: 384,
    coverObjectKey: "/covers/adr-case-04-hardcover.webp",
  },
  {
    sourceKey,
    recordKey: "adr-case-04-paperback",
    workKey: "adr-verified-work-04",
    title: "Glass Harbors",
    authors: [{ name: "Tomas Grey", key: "tomas-grey" }],
    categories: [{ label: "Fantasy", isPrimary: true }],
    format: "paperback",
    languages: [{ tag: "es", label: "Spanish" }],
    publishers: [{ name: "Puerto Norte", key: "puerto-norte" }],
    publicationDate: "2004",
    pages: 410,
    coverObjectKey: "/covers/adr-case-04-paperback.webp",
  },
  {
    sourceKey,
    recordKey: "adr-case-05-provider-edition",
    title: "No Number at Noon",
    authors: [{ name: "Ada Rowan", key: "ada-rowan" }],
    categories: [{ label: "Mystery & Thriller", isPrimary: true }],
  },
  {
    sourceKey,
    recordKey: "adr-case-06-compatible-date",
    title: "June, Precisely",
    authors: [{ name: "Eli Moss", key: "eli-moss" }],
    categories: [{ label: "Classics", isPrimary: true }],
    publicationDate: "1965",
  },
  {
    sourceKey,
    recordKey: "adr-case-07-conflicting-date",
    title: "The Disputed Almanac",
    authors: [{ name: "Rin Day", key: "rin-day" }],
    categories: [{ label: "Non-Fiction", isPrimary: true }],
    publicationDate: "1972",
  },
  {
    sourceKey,
    recordKey: "adr-case-08-a",
    title: "Twin Signal",
    authors: [{ name: "P. Lane", key: "p-lane-a" }],
    categories: [{ label: "Science Fiction", isPrimary: true }],
  },
  {
    sourceKey,
    recordKey: "adr-case-08-b",
    title: "Twin Signal",
    authors: [{ name: "P. Lane", key: "p-lane-b" }],
    categories: [{ label: "Science Fiction", isPrimary: true }],
  },
  {
    sourceKey,
    recordKey: "adr-case-09-missing",
    title: "The Empty Colophon",
    authors: [],
    categories: [],
  },
  {
    sourceKey,
    recordKey: "adr-case-10-stale",
    title: "Old Weather",
    authors: [{ name: "Lio March", key: "lio-march" }],
    categories: [{ label: "Non-Fiction", isPrimary: true }],
    description: "A once-current description retained with its lifecycle.",
  },
  {
    sourceKey,
    recordKey: "adr-case-11-withdrawn-cover",
    title: "Borrowed Jacket",
    authors: [{ name: "Nia West", key: "nia-west" }],
    categories: [{ label: "Classics", isPrimary: true }],
    coverObjectKey: "/covers/adr-shared.webp",
  },
  {
    sourceKey,
    recordKey: "adr-case-12-synthetic",
    title: "Fallback Country",
    authors: [{ name: "Jo Vale", key: "jo-vale" }],
    categories: [{ label: "Fantasy", isPrimary: true }],
    description: "A notable fantasy book by Jo Vale.",
    generatedDescription: true,
    rating: 4.4,
    ratingsCount: 912,
  },
];

const resolutionCandidate = (
  overrides: Partial<ResolutionCandidate>,
): ResolutionCandidate => ({
  id: "adr-observation-a",
  sourceKey: "approved-source-a",
  sourceApproved: true,
  sourcePriority: 1,
  value: "1965",
  provenanceKind: "imported",
  state: "active",
  retrievedAt: 100,
  ...overrides,
});

export const ADR_RESOLUTION_FIXTURES = {
  compatibleDates: [
    resolutionCandidate({ value: "1965" }),
    resolutionCandidate({
      id: "adr-observation-b",
      sourceKey: "approved-source-b",
      value: "1965-06-01",
    }),
  ],
  conflictingDates: [
    resolutionCandidate({ value: "1965" }),
    resolutionCandidate({
      id: "adr-observation-c",
      sourceKey: "approved-source-c",
      value: "1972",
    }),
  ],
  staleDescription: [
    resolutionCandidate({
      id: "adr-observation-stale",
      value: "A retained stale description.",
      state: "stale",
    }),
  ],
  withdrawnCover: [
    resolutionCandidate({
      id: "adr-observation-withdrawn",
      value: "/covers/adr-shared.webp",
      state: "withdrawn",
    }),
  ],
  syntheticDescription: [
    resolutionCandidate({
      id: "adr-observation-synthetic",
      value: "Generated fallback",
      provenanceKind: "synthetic",
    }),
  ],
} satisfies Record<string, ResolutionCandidate[]>;
