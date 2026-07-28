import type {
  DetailProvenance,
  DetailProvenanceField,
  EditionSummary,
  WorkDetail,
  WorkSummary,
} from "@/features/books/types";

const fixtureTimestamp = Date.UTC(2026, 6, 26);

export function provenanceFixture(
  entityType: DetailProvenance["entityType"],
  entityId: string,
  field: DetailProvenanceField,
  overrides: Partial<DetailProvenance> = {},
): DetailProvenance {
  return {
    entityType,
    entityId,
    field,
    state: "present",
    resolvedAt: fixtureTimestamp,
    reason: "Selected approved active source observation",
    evidence: {
      sourceKey: "legacy_catalog",
      sourceName: "Bukie legacy catalog artifact",
      sourceApproval: "approved",
      kind: field === "work.preferred_edition" ? "derived" : "imported",
      retrievedAt: fixtureTimestamp,
      eligible: true,
    },
    ...overrides,
  };
}

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
  firstPublication: { date: "1965-06", precision: "month" },
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
  provenance: [
    provenanceFixture("work", workSummaryFixture.id, "work.preferred_title"),
    provenanceFixture("work", workSummaryFixture.id, "work.description"),
    provenanceFixture(
      "work",
      workSummaryFixture.id,
      "work.first_publication_date",
    ),
    provenanceFixture("work", workSummaryFixture.id, "work.authors"),
    provenanceFixture("work", workSummaryFixture.id, "work.categories"),
    provenanceFixture("work", workSummaryFixture.id, "work.preferred_edition", {
      evidence: {
        sourceKey: "bukie_derivation",
        sourceName: "Bukie catalog derivations",
        sourceApproval: "approved",
        kind: "derived",
        retrievedAt: fixtureTimestamp,
        eligible: true,
      },
    }),
    ...(
      [
        "edition.publication_date",
        "edition.pages",
        "edition.publishers",
        "edition.languages",
        "edition.identifiers",
        "edition.covers",
      ] as const
    ).map((field) => provenanceFixture("edition", editionFixture.id, field)),
    provenanceFixture("edition", editionFixture.id, "edition.title", {
      state: "missing",
      evidence: undefined,
    }),
    provenanceFixture("edition", editionFixture.id, "edition.subtitle", {
      state: "missing",
      evidence: undefined,
    }),
    provenanceFixture("edition", editionFixture.id, "edition.format", {
      state: "missing",
      evidence: undefined,
    }),
  ],
};

export const partialWorkDetailFixture: WorkDetail = {
  id: "10000000-0000-4000-8000-000000000099",
  title: "Partial Work",
  authors: [],
  primaryCategory: undefined,
  preferredEdition: undefined,
  description: undefined,
  categories: [],
  editions: [],
  provenance: [
    provenanceFixture(
      "work",
      "10000000-0000-4000-8000-000000000099",
      "work.preferred_title",
    ),
    ...(
      [
        "work.description",
        "work.first_publication_date",
        "work.authors",
        "work.categories",
        "work.preferred_edition",
      ] as const
    ).map((field) =>
      provenanceFixture("work", "10000000-0000-4000-8000-000000000099", field, {
        state: "missing",
        evidence: undefined,
        reason: "No eligible approved observation",
      }),
    ),
  ],
};
