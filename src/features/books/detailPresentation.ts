import type {
  DetailProvenance,
  DetailProvenanceField,
  EditionSummary,
  WorkDetail,
} from "./types";

const fieldOrder: DetailProvenanceField[] = [
  "work.preferred_title",
  "work.authors",
  "work.categories",
  "work.description",
  "work.preferred_edition",
  "edition.title",
  "edition.subtitle",
  "edition.format",
  "edition.publication_date",
  "edition.pages",
  "edition.publishers",
  "edition.languages",
  "edition.identifiers",
  "edition.covers",
];

const fieldLabels: Record<DetailProvenanceField, string> = {
  "work.preferred_title": "Title",
  "work.description": "Description",
  "work.preferred_edition": "Edition used for display",
  "work.authors": "Creators",
  "work.categories": "Categories",
  "edition.title": "Edition title",
  "edition.subtitle": "Subtitle",
  "edition.format": "Format",
  "edition.publication_date": "Publication date",
  "edition.pages": "Page count",
  "edition.publishers": "Publishers",
  "edition.languages": "Languages",
  "edition.identifiers": "Identifiers",
  "edition.covers": "Cover",
};

const stateLabels: Record<DetailProvenance["state"], string> = {
  present: "Available",
  missing: "Not available",
  conflicting: "Conflicting evidence",
  stale: "Stale",
  withdrawn: "Withdrawn",
};

const kindLabels: Record<
  NonNullable<DetailProvenance["evidence"]>["kind"],
  string
> = {
  curated: "Curated",
  imported: "Imported",
  derived: "Derived",
  synthetic: "Synthetic",
};

export type DetailProvenanceGroup = {
  id: string;
  label: string;
  scope: "work" | "preferred-edition" | "alternate-edition";
  items: DetailProvenance[];
};

export function detailFieldLabel(field: DetailProvenanceField): string {
  return fieldLabels[field];
}

export function detailStateLabel(state: DetailProvenance["state"]): string {
  return stateLabels[state];
}

export function detailProvenanceStatusLabel(
  provenance: DetailProvenance,
): string {
  if (
    (provenance.state === "present" || provenance.state === "stale") &&
    !provenance.evidence?.eligible
  ) {
    return stateLabels.missing;
  }
  return detailStateLabel(provenance.state);
}

export function detailEvidenceKindLabel(
  kind: NonNullable<DetailProvenance["evidence"]>["kind"],
): string {
  return kindLabels[kind];
}

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

export function groupDetailProvenance(
  work: WorkDetail,
): DetailProvenanceGroup[] {
  const order = new Map(fieldOrder.map((field, index) => [field, index]));
  const sorted = (items: DetailProvenance[]) =>
    [...items].sort(
      (left, right) =>
        (order.get(left.field) ?? Number.MAX_SAFE_INTEGER) -
          (order.get(right.field) ?? Number.MAX_SAFE_INTEGER) ||
        left.field.localeCompare(right.field),
    );
  const groups: DetailProvenanceGroup[] = [];
  const workItems = work.provenance.filter(
    (item) =>
      item.entityType === "work" &&
      item.entityId === work.id &&
      item.state !== "missing",
  );
  if (workItems.length > 0) {
    groups.push({
      id: `work:${work.id}`,
      label: "Work details",
      scope: "work",
      items: sorted(workItems),
    });
  }

  const preferredId = work.preferredEdition?.id;
  const orderedEditions = [
    ...work.editions.filter((edition) => edition.id === preferredId),
    ...work.editions.filter((edition) => edition.id !== preferredId),
  ];
  let alternateNumber = 0;
  for (const edition of orderedEditions) {
    const items = work.provenance.filter(
      (item) =>
        item.entityType === "edition" &&
        item.entityId === edition.id &&
        item.state !== "missing",
    );
    if (items.length === 0) continue;
    const isPreferred = edition.id === preferredId;
    if (!isPreferred) alternateNumber += 1;
    groups.push({
      id: `edition:${edition.id}`,
      label: isPreferred
        ? "Preferred edition details"
        : editionDisplayLabel(edition, `Alternate edition ${alternateNumber}`),
      scope: isPreferred ? "preferred-edition" : "alternate-edition",
      items: sorted(items),
    });
  }
  return groups;
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
