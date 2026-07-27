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

export type WorkSummary = {
  id: string;
  title: string;
  authors: WorkAuthor[];
  primaryCategory?: WorkCategory;
  preferredEdition?: EditionSummary;
};

export type WorkDetail = WorkSummary & {
  description?: string;
  categories: WorkCategory[];
  editions: EditionSummary[];
};
