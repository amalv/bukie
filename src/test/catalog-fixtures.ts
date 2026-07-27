import type {
  EditionSummary,
  WorkDetail,
  WorkSummary,
} from "@/features/books/types";

export const editionFixture: EditionSummary = {
  id: "20000000-0000-4000-8000-000000000001",
  publication: { date: "2020", precision: "year" },
  pages: 320,
  catalogedAt: 1_700_000_000_000,
  publishers: [
    {
      id: "30000000-0000-4000-8000-000000000001",
      name: "Example Press",
      role: "publisher",
      position: 0,
    },
  ],
  languages: [{ tag: "en", label: "English", position: 0 }],
  identifiers: [
    {
      id: "40000000-0000-4000-8000-000000000001",
      scheme: "isbn13",
      value: "9780441172719",
      displayValue: "978-0-441-17271-9",
      isPrimary: true,
    },
  ],
  cover: {
    id: "50000000-0000-4000-8000-000000000001",
    objectKey: "/covers/example.webp",
    mediaType: "image/webp",
  },
};

export const workSummaryFixture: WorkSummary = {
  id: "10000000-0000-4000-8000-000000000001",
  title: "Example Work",
  authors: [
    {
      id: "60000000-0000-4000-8000-000000000001",
      name: "First Author",
      role: "author",
      position: 0,
    },
    {
      id: "60000000-0000-4000-8000-000000000002",
      name: "Second Author",
      role: "author",
      position: 1,
    },
  ],
  primaryCategory: {
    id: "70000000-0000-4000-8000-000000000001",
    slug: "fiction",
    label: "Fiction",
    position: 0,
    isPrimary: true,
  },
  preferredEdition: editionFixture,
};

export const workDetailFixture: WorkDetail = {
  ...workSummaryFixture,
  description: "Stored catalog description.",
  categories: [
    {
      id: "70000000-0000-4000-8000-000000000001",
      slug: "fiction",
      label: "Fiction",
      position: 0,
      isPrimary: true,
    },
    {
      id: "70000000-0000-4000-8000-000000000002",
      slug: "classics",
      label: "Classics",
      position: 1,
      isPrimary: false,
    },
  ],
  editions: [editionFixture],
};
