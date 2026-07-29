import type { EditionSummary, WorkDetail } from "./types";

export function hasEditionBibliographicFacts(
  edition: EditionSummary | undefined,
): boolean {
  return Boolean(
    edition &&
      (edition.title ||
        edition.subtitle ||
        edition.format ||
        edition.publication ||
        edition.pages ||
        edition.publishers.length > 0 ||
        edition.languages.length > 0 ||
        edition.identifiers.length > 0),
  );
}

export function editionDisplayLabel(
  edition: EditionSummary,
  fallback: string,
): string {
  if (edition.title) return edition.title;
  if (edition.format) {
    return `${edition.format[0].toUpperCase()}${edition.format.slice(1)} edition`;
  }
  return fallback;
}

function creatorValues(work: WorkDetail, role: string): string[] | undefined {
  const values = work.authors
    .filter((creator) => creator.role === role)
    .map((creator) => creator.name);
  return values.length > 0 ? values : undefined;
}

function structuredEdition(
  edition: EditionSummary,
): Record<string, unknown> | undefined {
  const bookFormat = {
    hardcover: "https://schema.org/Hardcover",
    paperback: "https://schema.org/Paperback",
    ebook: "https://schema.org/EBook",
    audiobook: "https://schema.org/AudiobookFormat",
  } as const;
  const identifiers = edition.identifiers.map(
    (identifier) => identifier.displayValue ?? identifier.value,
  );
  const data: Record<string, unknown> = {
    "@type": "Book",
    ...(edition.title ? { name: edition.title } : {}),
    ...(edition.subtitle ? { alternativeHeadline: edition.subtitle } : {}),
    ...(edition.format && edition.format !== "other"
      ? { bookFormat: bookFormat[edition.format] }
      : {}),
    ...(edition.publication ? { datePublished: edition.publication.date } : {}),
    ...(edition.pages ? { numberOfPages: edition.pages } : {}),
    ...(edition.publishers.length > 0
      ? { publisher: edition.publishers.map((publisher) => publisher.name) }
      : {}),
    ...(edition.languages.length > 0
      ? { inLanguage: edition.languages.map((language) => language.tag) }
      : {}),
    ...(identifiers.length > 0 ? { isbn: identifiers } : {}),
  };
  return Object.keys(data).length > 1 ? data : undefined;
}

export function buildBookStructuredData(
  work: WorkDetail,
): Record<string, unknown> {
  const editions = work.editions
    .map(structuredEdition)
    .filter((edition): edition is Record<string, unknown> => Boolean(edition));
  return {
    "@context": "https://schema.org",
    "@type": "Book",
    name: work.title,
    ...(work.firstPublication
      ? { datePublished: work.firstPublication.date }
      : {}),
    ...(work.description ? { description: work.description } : {}),
    ...(work.categories.length > 0
      ? { genre: work.categories.map((category) => category.label) }
      : {}),
    ...(creatorValues(work, "author")
      ? { author: creatorValues(work, "author") }
      : {}),
    ...(creatorValues(work, "editor")
      ? { editor: creatorValues(work, "editor") }
      : {}),
    ...(creatorValues(work, "translator")
      ? { translator: creatorValues(work, "translator") }
      : {}),
    ...(creatorValues(work, "illustrator")
      ? { illustrator: creatorValues(work, "illustrator") }
      : {}),
    ...(editions.length > 0 ? { workExample: editions } : {}),
  };
}

export function serializeStructuredData(data: Record<string, unknown>): string {
  return JSON.stringify(data).replaceAll("<", "\\u003c");
}
