export const CATALOG_ENTITY_TYPES = [
  "work",
  "edition",
  "author",
  "category",
  "publisher",
  "cover_asset",
] as const;

export const CATALOG_FIELD_KEYS = [
  "work.preferred_title",
  "work.description",
  "work.first_publication_date",
  "work.preferred_edition",
  "work.authors",
  "work.categories",
  "edition.title",
  "edition.subtitle",
  "edition.format",
  "edition.publication_date",
  "edition.pages",
  "edition.publishers",
  "edition.languages",
  "edition.identifiers",
  "edition.covers",
  "author.display_name",
  "category.label",
  "publisher.display_name",
  "cover_asset.object_key",
  "legacy.rating",
  "legacy.ratings_count",
] as const;

export const AUTHOR_ROLES = [
  "author",
  "editor",
  "translator",
  "illustrator",
] as const;
export const PUBLISHER_ROLES = [
  "publisher",
  "co_publisher",
  "imprint",
  "distributor",
] as const;
export const CATEGORY_STATUSES = ["active", "retired"] as const;
export const EDITION_FORMATS = [
  "hardcover",
  "paperback",
  "ebook",
  "audiobook",
  "other",
] as const;
export const PUBLICATION_PRECISIONS = ["year", "month", "day"] as const;
export const IDENTIFIER_SCHEMES = ["isbn10", "isbn13"] as const;
export const COVER_STATES = [
  "available",
  "missing",
  "withdrawn",
  "failed",
] as const;
export const SOURCE_APPROVAL_STATES = [
  "pending",
  "approved",
  "suspended",
  "retired",
] as const;
export const PAYLOAD_POLICIES = ["none", "selected_fields", "full"] as const;
export const SOURCE_RECORD_STATES = ["active", "withdrawn", "deleted"] as const;
export const SOURCE_MATCH_KINDS = [
  "exact_identifier",
  "source_relationship",
  "curated",
  "candidate",
] as const;
export const SOURCE_LINK_STATES = ["active", "candidate", "rejected"] as const;
export const PROVENANCE_KINDS = [
  "curated",
  "imported",
  "derived",
  "synthetic",
] as const;
export const OBSERVATION_STATES = [
  "active",
  "stale",
  "withdrawn",
  "invalid",
] as const;
export const RESOLUTION_STATES = [
  "present",
  "missing",
  "conflicting",
  "stale",
  "withdrawn",
] as const;
export const CHANGE_TYPES = [
  "work_merge",
  "work_split",
  "edition_reassignment",
] as const;
export const DESCRIPTION_CLASSES = [
  "licensed_verbatim",
  "bukie_editorial",
  "model_assisted_candidate",
] as const;
export const DESCRIPTION_DECISION_STATES = [
  "candidate",
  "review_required",
  "paused",
  "rejected",
  "eligible",
  "withdrawn",
  "invalidated",
] as const;
export const DESCRIPTION_QUEUE_STATES = [
  "queued",
  "claimed",
  "completed",
  "cancelled",
] as const;
export const DESCRIPTION_PROJECTION_STATES = [
  "selected",
  "withdrawn",
  "invalidated",
  "rolled_back",
] as const;

export type CatalogEntityType = (typeof CATALOG_ENTITY_TYPES)[number];
export type CatalogFieldKey = (typeof CATALOG_FIELD_KEYS)[number];
export type ProvenanceKind = (typeof PROVENANCE_KINDS)[number];
export type ObservationState = (typeof OBSERVATION_STATES)[number];
export type ResolutionState = (typeof RESOLUTION_STATES)[number];
export type DescriptionClass = (typeof DESCRIPTION_CLASSES)[number];
export type DescriptionDecisionState =
  (typeof DESCRIPTION_DECISION_STATES)[number];
export type DescriptionQueueState = (typeof DESCRIPTION_QUEUE_STATES)[number];
export type DescriptionProjectionState =
  (typeof DESCRIPTION_PROJECTION_STATES)[number];

export function sqlList(values: readonly string[]): string {
  return values.map((value) => `'${value.replaceAll("'", "''")}'`).join(", ");
}
