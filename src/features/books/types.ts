export type WorkAuthor = {
  id: string;
  name: string;
  role: "author" | "editor" | "translator" | "illustrator";
  position: number;
};

export type WorkCategory = {
  id: string;
  slug: string;
  label: string;
  position: number;
  isPrimary: boolean;
};

export type EditionPublisher = {
  id: string;
  name: string;
  role?: "publisher" | "co_publisher" | "imprint" | "distributor";
  position: number;
};

export type EditionLanguage = {
  tag: string;
  label: string;
  position: number;
};

export type EditionIdentifier = {
  id: string;
  scheme: "isbn10" | "isbn13";
  value: string;
  displayValue?: string;
  isPrimary: boolean;
};

export type EditionCover = {
  id: string;
  objectKey: string;
  mediaType?: string;
  width?: number;
  height?: number;
};

export type EditionSummary = {
  id: string;
  title?: string;
  subtitle?: string;
  format?: "hardcover" | "paperback" | "ebook" | "audiobook" | "other";
  publication?: {
    date: string;
    precision: "year" | "month" | "day";
  };
  pages?: number;
  catalogedAt: number;
  publishers: EditionPublisher[];
  languages: EditionLanguage[];
  identifiers: EditionIdentifier[];
  cover?: EditionCover;
};

export type DetailProvenanceField =
  | "work.preferred_title"
  | "work.description"
  | "work.first_publication_date"
  | "work.preferred_edition"
  | "work.authors"
  | "work.categories"
  | "edition.title"
  | "edition.subtitle"
  | "edition.format"
  | "edition.publication_date"
  | "edition.pages"
  | "edition.publishers"
  | "edition.languages"
  | "edition.identifiers"
  | "edition.covers";

export type DetailProvenance = {
  entityType: "work" | "edition";
  entityId: string;
  field: DetailProvenanceField;
  state: "present" | "missing" | "conflicting" | "stale" | "withdrawn";
  resolvedAt: number;
  reason: string;
  evidence?: {
    sourceKey: string;
    sourceName: string;
    sourceApproval: "pending" | "approved" | "suspended" | "retired";
    kind: "curated" | "imported" | "derived" | "synthetic";
    retrievedAt: number;
    eligible: boolean;
  };
};

export type WorkSummary = {
  id: string;
  title: string;
  authors: WorkAuthor[];
  primaryCategory?: WorkCategory;
  preferredEdition?: EditionSummary;
};

export type WorkDetail = WorkSummary & {
  description?: string;
  firstPublication?: {
    date: string;
    precision: "year" | "month" | "day";
  };
  categories: WorkCategory[];
  editions: EditionSummary[];
  provenance: DetailProvenance[];
};
