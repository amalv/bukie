import { sql } from "drizzle-orm";
import {
  type AnyPgColumn,
  bigint,
  boolean,
  check,
  doublePrecision,
  index,
  integer,
  jsonb,
  pgTable,
  primaryKey,
  text,
  uniqueIndex,
} from "drizzle-orm/pg-core";
import {
  AUTHOR_ROLES,
  CATALOG_ENTITY_TYPES,
  CATALOG_FIELD_KEYS,
  CATEGORY_STATUSES,
  CHANGE_TYPES,
  COVER_STATES,
  DESCRIPTION_CLASSES,
  DESCRIPTION_DECISION_STATES,
  DESCRIPTION_PROJECTION_STATES,
  DESCRIPTION_QUEUE_STATES,
  EDITION_FORMATS,
  IDENTIFIER_SCHEMES,
  OBSERVATION_STATES,
  PAYLOAD_POLICIES,
  PROVENANCE_KINDS,
  PUBLICATION_PRECISIONS,
  PUBLISHER_ROLES,
  RESOLUTION_STATES,
  SOURCE_APPROVAL_STATES,
  SOURCE_LINK_STATES,
  SOURCE_MATCH_KINDS,
  SOURCE_RECORD_STATES,
  sqlList,
} from "./values";

const entityTypes = sql.raw(sqlList(CATALOG_ENTITY_TYPES));
const fieldKeys = sql.raw(sqlList(CATALOG_FIELD_KEYS));
const timestamp = (name: string) => bigint(name, { mode: "number" });

export const metadataSourcesPg = pgTable(
  "metadata_sources",
  {
    id: text("id").primaryKey(),
    key: text("key").notNull(),
    name: text("name").notNull(),
    termsUrl: text("terms_url"),
    attributionUrl: text("attribution_url"),
    reviewedAt: timestamp("reviewed_at"),
    approvalState: text("approval_state").notNull(),
    metadataPolicy: jsonb("metadata_policy").notNull(),
    assetPolicy: jsonb("asset_policy").notNull(),
    payloadPolicy: text("payload_policy").notNull(),
    refreshIntervalMs: timestamp("refresh_interval_ms"),
  },
  (table) => [
    uniqueIndex("metadata_sources_key_uq").on(table.key),
    check(
      "metadata_sources_nonempty_ck",
      sql`length(trim(${table.key})) > 0 and length(trim(${table.name})) > 0`,
    ),
    check(
      "metadata_sources_approval_state_ck",
      sql`${table.approvalState} in (${sql.raw(sqlList(SOURCE_APPROVAL_STATES))})`,
    ),
    check(
      "metadata_sources_payload_policy_ck",
      sql`${table.payloadPolicy} in (${sql.raw(sqlList(PAYLOAD_POLICIES))})`,
    ),
    check(
      "metadata_sources_approved_review_ck",
      sql`${table.approvalState} <> 'approved' or ${table.reviewedAt} is not null`,
    ),
    check(
      "metadata_sources_refresh_ck",
      sql`${table.refreshIntervalMs} is null or ${table.refreshIntervalMs} > 0`,
    ),
  ],
);

export const worksPg = pgTable(
  "works",
  {
    id: text("id").primaryKey(),
    preferredTitle: text("preferred_title").notNull(),
    sortTitle: text("sort_title").notNull(),
    description: text("description"),
    firstPublicationDate: text("first_publication_date"),
    firstPublicationPrecision: text("first_publication_precision"),
    firstPublicationSortDate: text("first_publication_sort_date"),
    preferredEditionId: text("preferred_edition_id").references(
      (): AnyPgColumn => editionsPg.id,
      { onDelete: "set null" },
    ),
    createdAt: timestamp("created_at").notNull(),
    updatedAt: timestamp("updated_at").notNull(),
  },
  (table) => [
    check(
      "works_titles_nonempty_ck",
      sql`length(trim(${table.preferredTitle})) > 0 and length(trim(${table.sortTitle})) > 0`,
    ),
    check(
      "works_first_publication_precision_ck",
      sql`${table.firstPublicationPrecision} is null or ${table.firstPublicationPrecision} in (${sql.raw(sqlList(PUBLICATION_PRECISIONS))})`,
    ),
    check(
      "works_first_publication_date_ck",
      sql`(
        ${table.firstPublicationDate} is null
        and ${table.firstPublicationPrecision} is null
        and ${table.firstPublicationSortDate} is null
      ) or (
        ${table.firstPublicationDate} is not null
        and ${table.firstPublicationPrecision} is not null
        and ${table.firstPublicationSortDate} is not null
        and (
          (
            ${table.firstPublicationPrecision} = 'year'
            and length(${table.firstPublicationDate}) = 4
            and ${table.firstPublicationSortDate} = ${table.firstPublicationDate} || '-01-01'
          ) or (
            ${table.firstPublicationPrecision} = 'month'
            and length(${table.firstPublicationDate}) = 7
            and substring(${table.firstPublicationDate} from 5 for 1) = '-'
            and ${table.firstPublicationSortDate} = ${table.firstPublicationDate} || '-01'
          ) or (
            ${table.firstPublicationPrecision} = 'day'
            and length(${table.firstPublicationDate}) = 10
            and substring(${table.firstPublicationDate} from 5 for 1) = '-'
            and substring(${table.firstPublicationDate} from 8 for 1) = '-'
            and ${table.firstPublicationSortDate} = ${table.firstPublicationDate}
          )
        )
      )`,
    ),
    index("works_sort_title_id_idx").on(table.sortTitle, table.id),
    index("works_preferred_edition_idx").on(table.preferredEditionId),
  ],
);

export const editionsPg = pgTable(
  "editions",
  {
    id: text("id").primaryKey(),
    workId: text("work_id")
      .notNull()
      .references(() => worksPg.id, { onDelete: "restrict" }),
    title: text("title"),
    subtitle: text("subtitle"),
    format: text("format"),
    publicationDate: text("publication_date"),
    publicationPrecision: text("publication_precision"),
    publicationSortDate: text("publication_sort_date"),
    pages: integer("pages"),
    catalogedAt: timestamp("cataloged_at").notNull(),
    createdAt: timestamp("created_at").notNull(),
    updatedAt: timestamp("updated_at").notNull(),
  },
  (table) => [
    check(
      "editions_title_ck",
      sql`${table.title} is null or length(trim(${table.title})) > 0`,
    ),
    check(
      "editions_subtitle_ck",
      sql`${table.subtitle} is null or length(trim(${table.subtitle})) > 0`,
    ),
    check(
      "editions_format_ck",
      sql`${table.format} is null or ${table.format} in (${sql.raw(sqlList(EDITION_FORMATS))})`,
    ),
    check(
      "editions_pages_ck",
      sql`${table.pages} is null or ${table.pages} > 0`,
    ),
    check(
      "editions_publication_precision_ck",
      sql`${table.publicationPrecision} is null or ${table.publicationPrecision} in (${sql.raw(sqlList(PUBLICATION_PRECISIONS))})`,
    ),
    check(
      "editions_publication_date_ck",
      sql`(
        ${table.publicationDate} is null
        and ${table.publicationPrecision} is null
        and ${table.publicationSortDate} is null
      ) or (
        ${table.publicationPrecision} = 'year'
        and length(${table.publicationDate}) = 4
        and ${table.publicationSortDate} = ${table.publicationDate} || '-01-01'
      ) or (
        ${table.publicationPrecision} = 'month'
        and length(${table.publicationDate}) = 7
        and substring(${table.publicationDate} from 5 for 1) = '-'
        and ${table.publicationSortDate} = ${table.publicationDate} || '-01'
      ) or (
        ${table.publicationPrecision} = 'day'
        and length(${table.publicationDate}) = 10
        and substring(${table.publicationDate} from 5 for 1) = '-'
        and substring(${table.publicationDate} from 8 for 1) = '-'
        and ${table.publicationSortDate} = ${table.publicationDate}
      )`,
    ),
    index("editions_work_id_idx").on(table.workId),
    index("editions_publication_sort_work_idx").on(
      table.publicationSortDate,
      table.workId,
    ),
    index("editions_cataloged_work_idx").on(table.catalogedAt, table.workId),
  ],
);

export const authorsPg = pgTable(
  "authors",
  {
    id: text("id").primaryKey(),
    displayName: text("display_name").notNull(),
    sortName: text("sort_name"),
  },
  (table) => [
    check(
      "authors_name_nonempty_ck",
      sql`length(trim(${table.displayName})) > 0`,
    ),
    check(
      "authors_sort_name_ck",
      sql`${table.sortName} is null or length(trim(${table.sortName})) > 0`,
    ),
    index("authors_sort_name_idx").on(table.sortName),
  ],
);

export const workAuthorsPg = pgTable(
  "work_authors",
  {
    workId: text("work_id")
      .notNull()
      .references(() => worksPg.id, { onDelete: "cascade" }),
    authorId: text("author_id")
      .notNull()
      .references(() => authorsPg.id, { onDelete: "restrict" }),
    role: text("role").notNull().default("author"),
    position: integer("position").notNull(),
  },
  (table) => [
    primaryKey({
      name: "work_authors_pk",
      columns: [table.workId, table.authorId, table.role],
    }),
    uniqueIndex("work_authors_position_uq").on(table.workId, table.position),
    check(
      "work_authors_role_ck",
      sql`${table.role} in (${sql.raw(sqlList(AUTHOR_ROLES))})`,
    ),
    check("work_authors_position_ck", sql`${table.position} >= 0`),
    index("work_authors_owner_position_idx").on(table.workId, table.position),
    index("work_authors_author_work_idx").on(table.authorId, table.workId),
  ],
);

export const categoriesPg = pgTable(
  "categories",
  {
    id: text("id").primaryKey(),
    slug: text("slug").notNull(),
    label: text("label").notNull(),
    status: text("status").notNull().default("active"),
  },
  (table) => [
    uniqueIndex("categories_slug_uq").on(table.slug),
    check(
      "categories_nonempty_ck",
      sql`length(trim(${table.slug})) > 0 and length(trim(${table.label})) > 0`,
    ),
    check(
      "categories_status_ck",
      sql`${table.status} in (${sql.raw(sqlList(CATEGORY_STATUSES))})`,
    ),
  ],
);

export const workCategoriesPg = pgTable(
  "work_categories",
  {
    workId: text("work_id")
      .notNull()
      .references(() => worksPg.id, { onDelete: "cascade" }),
    categoryId: text("category_id")
      .notNull()
      .references(() => categoriesPg.id, { onDelete: "restrict" }),
    position: integer("position").notNull(),
    isPrimary: boolean("is_primary").notNull().default(false),
  },
  (table) => [
    primaryKey({
      name: "work_categories_pk",
      columns: [table.workId, table.categoryId],
    }),
    uniqueIndex("work_categories_position_uq").on(table.workId, table.position),
    uniqueIndex("work_categories_primary_uq")
      .on(table.workId)
      .where(sql`${table.isPrimary}`),
    check("work_categories_position_ck", sql`${table.position} >= 0`),
    index("work_categories_owner_position_idx").on(
      table.workId,
      table.position,
    ),
    index("work_categories_category_work_idx").on(
      table.categoryId,
      table.workId,
    ),
  ],
);

export const publishersPg = pgTable(
  "publishers",
  {
    id: text("id").primaryKey(),
    displayName: text("display_name").notNull(),
  },
  (table) => [
    check(
      "publishers_name_nonempty_ck",
      sql`length(trim(${table.displayName})) > 0`,
    ),
  ],
);

export const editionPublishersPg = pgTable(
  "edition_publishers",
  {
    editionId: text("edition_id")
      .notNull()
      .references(() => editionsPg.id, { onDelete: "cascade" }),
    publisherId: text("publisher_id")
      .notNull()
      .references(() => publishersPg.id, { onDelete: "restrict" }),
    position: integer("position").notNull(),
    role: text("role"),
  },
  (table) => [
    primaryKey({
      name: "edition_publishers_pk",
      columns: [table.editionId, table.publisherId],
    }),
    uniqueIndex("edition_publishers_position_uq").on(
      table.editionId,
      table.position,
    ),
    check("edition_publishers_position_ck", sql`${table.position} >= 0`),
    check(
      "edition_publishers_role_ck",
      sql`${table.role} is null or ${table.role} in (${sql.raw(sqlList(PUBLISHER_ROLES))})`,
    ),
    index("edition_publishers_owner_position_idx").on(
      table.editionId,
      table.position,
    ),
  ],
);

export const languagesPg = pgTable(
  "languages",
  {
    tag: text("tag").primaryKey(),
    label: text("label").notNull(),
  },
  (table) => [
    check(
      "languages_nonempty_ck",
      sql`length(trim(${table.tag})) > 0 and length(trim(${table.label})) > 0`,
    ),
  ],
);

export const editionLanguagesPg = pgTable(
  "edition_languages",
  {
    editionId: text("edition_id")
      .notNull()
      .references(() => editionsPg.id, { onDelete: "cascade" }),
    languageTag: text("language_tag")
      .notNull()
      .references(() => languagesPg.tag, { onDelete: "restrict" }),
    position: integer("position").notNull(),
  },
  (table) => [
    primaryKey({
      name: "edition_languages_pk",
      columns: [table.editionId, table.languageTag],
    }),
    uniqueIndex("edition_languages_position_uq").on(
      table.editionId,
      table.position,
    ),
    check("edition_languages_position_ck", sql`${table.position} >= 0`),
    index("edition_languages_owner_position_idx").on(
      table.editionId,
      table.position,
    ),
    index("edition_languages_language_edition_idx").on(
      table.languageTag,
      table.editionId,
    ),
  ],
);

export const editionIdentifiersPg = pgTable(
  "edition_identifiers",
  {
    id: text("id").primaryKey(),
    editionId: text("edition_id")
      .notNull()
      .references(() => editionsPg.id, { onDelete: "cascade" }),
    scheme: text("scheme").notNull(),
    valueNormalized: text("value_normalized").notNull(),
    valueDisplay: text("value_display"),
    isPrimary: boolean("is_primary").notNull().default(false),
  },
  (table) => [
    uniqueIndex("edition_identifiers_value_uq").on(
      table.scheme,
      table.valueNormalized,
    ),
    uniqueIndex("edition_identifiers_primary_uq")
      .on(table.editionId)
      .where(sql`${table.isPrimary}`),
    check(
      "edition_identifiers_scheme_ck",
      sql`${table.scheme} in (${sql.raw(sqlList(IDENTIFIER_SCHEMES))})`,
    ),
    check(
      "edition_identifiers_value_ck",
      sql`length(trim(${table.valueNormalized})) > 0`,
    ),
    index("edition_identifiers_owner_idx").on(table.editionId),
  ],
);

export const coverAssetsPg = pgTable(
  "cover_assets",
  {
    id: text("id").primaryKey(),
    objectKey: text("object_key").notNull(),
    mediaType: text("media_type"),
    width: integer("width"),
    height: integer("height"),
    bytes: bigint("bytes", { mode: "number" }),
    checksum: text("checksum"),
    state: text("state").notNull(),
    sourcePolicyId: text("source_policy_id").references(
      () => metadataSourcesPg.id,
      { onDelete: "set null" },
    ),
  },
  (table) => [
    uniqueIndex("cover_assets_object_key_uq").on(table.objectKey),
    check(
      "cover_assets_object_key_ck",
      sql`length(trim(${table.objectKey})) > 0 and substring(${table.objectKey} from 1 for 8) = '/covers/'`,
    ),
    check(
      "cover_assets_state_ck",
      sql`${table.state} in (${sql.raw(sqlList(COVER_STATES))})`,
    ),
    check(
      "cover_assets_dimensions_ck",
      sql`(${table.width} is null or ${table.width} > 0)
        and (${table.height} is null or ${table.height} > 0)
        and (${table.bytes} is null or ${table.bytes} > 0)`,
    ),
  ],
);

export const editionCoversPg = pgTable(
  "edition_covers",
  {
    editionId: text("edition_id")
      .notNull()
      .references(() => editionsPg.id, { onDelete: "cascade" }),
    coverAssetId: text("cover_asset_id")
      .notNull()
      .references(() => coverAssetsPg.id, { onDelete: "restrict" }),
    position: integer("position").notNull(),
    isPrimary: boolean("is_primary").notNull().default(false),
  },
  (table) => [
    primaryKey({
      name: "edition_covers_pk",
      columns: [table.editionId, table.coverAssetId],
    }),
    uniqueIndex("edition_covers_position_uq").on(
      table.editionId,
      table.position,
    ),
    uniqueIndex("edition_covers_primary_uq")
      .on(table.editionId)
      .where(sql`${table.isPrimary}`),
    check("edition_covers_position_ck", sql`${table.position} >= 0`),
    index("edition_covers_owner_position_idx").on(
      table.editionId,
      table.position,
    ),
    index("edition_covers_primary_lookup_idx").on(
      table.editionId,
      table.isPrimary,
    ),
  ],
);

export const sourceRecordsPg = pgTable(
  "source_records",
  {
    id: text("id").primaryKey(),
    sourceId: text("source_id")
      .notNull()
      .references(() => metadataSourcesPg.id, { onDelete: "restrict" }),
    recordKey: text("record_key").notNull(),
    sourceRevision: text("source_revision"),
    sourceModifiedAt: timestamp("source_modified_at"),
    retrievedAt: timestamp("retrieved_at").notNull(),
    payloadJson: jsonb("payload_json"),
    payloadHash: text("payload_hash"),
    importerVersion: text("importer_version"),
    sourceRowHash: text("source_row_hash"),
    state: text("state").notNull(),
  },
  (table) => [
    uniqueIndex("source_records_source_key_uq").on(
      table.sourceId,
      table.recordKey,
    ),
    check(
      "source_records_key_nonempty_ck",
      sql`length(trim(${table.recordKey})) > 0`,
    ),
    check(
      "source_records_state_ck",
      sql`${table.state} in (${sql.raw(sqlList(SOURCE_RECORD_STATES))})`,
    ),
    check(
      "source_records_import_hash_ck",
      sql`(${table.importerVersion} is null and ${table.sourceRowHash} is null)
        or (length(trim(${table.importerVersion})) > 0 and length(${table.sourceRowHash}) = 64)`,
    ),
    index("source_records_refresh_idx").on(
      table.sourceId,
      table.state,
      table.retrievedAt,
    ),
  ],
);

export const sourceRecordLinksPg = pgTable(
  "source_record_links",
  {
    sourceRecordId: text("source_record_id")
      .notNull()
      .references(() => sourceRecordsPg.id, { onDelete: "cascade" }),
    entityType: text("entity_type").notNull(),
    entityId: text("entity_id").notNull(),
    matchKind: text("match_kind").notNull(),
    mappingConfidence: doublePrecision("mapping_confidence").notNull(),
    state: text("state").notNull(),
    actorRef: text("actor_ref"),
    reason: text("reason"),
    createdAt: timestamp("created_at").notNull(),
  },
  (table) => [
    primaryKey({
      name: "source_record_links_pk",
      columns: [table.sourceRecordId, table.entityType, table.entityId],
    }),
    check(
      "source_record_links_entity_type_ck",
      sql`${table.entityType} in (${entityTypes})`,
    ),
    check(
      "source_record_links_match_kind_ck",
      sql`${table.matchKind} in (${sql.raw(sqlList(SOURCE_MATCH_KINDS))})`,
    ),
    check(
      "source_record_links_state_ck",
      sql`${table.state} in (${sql.raw(sqlList(SOURCE_LINK_STATES))})`,
    ),
    check(
      "source_record_links_confidence_ck",
      sql`${table.mappingConfidence} between 0 and 1`,
    ),
    check(
      "source_record_links_actor_ck",
      sql`(
        ${table.matchKind} <> 'curated' and ${table.state} <> 'rejected'
      ) or (
        length(trim(${table.actorRef})) > 0 and length(trim(${table.reason})) > 0
      )`,
    ),
    index("source_record_links_entity_idx").on(
      table.entityType,
      table.entityId,
      table.state,
    ),
  ],
);

export const fieldObservationsPg = pgTable(
  "field_observations",
  {
    id: text("id").primaryKey(),
    sourceRecordId: text("source_record_id")
      .notNull()
      .references(() => sourceRecordsPg.id, { onDelete: "restrict" }),
    entityType: text("entity_type").notNull(),
    entityId: text("entity_id").notNull(),
    fieldKey: text("field_key").notNull(),
    valueJson: jsonb("value_json").notNull(),
    comparisonHash: text("comparison_hash").notNull(),
    provenanceKind: text("provenance_kind").notNull(),
    sourcePath: text("source_path"),
    sourceModifiedAt: timestamp("source_modified_at"),
    retrievedAt: timestamp("retrieved_at").notNull(),
    mappingConfidence: doublePrecision("mapping_confidence").notNull(),
    state: text("state").notNull(),
    actorRef: text("actor_ref"),
    reason: text("reason"),
    derivationName: text("derivation_name"),
    derivationVersion: text("derivation_version"),
    parentIdsJson: jsonb("parent_ids_json"),
  },
  (table) => [
    uniqueIndex("field_observations_identity_uq").on(table.id),
    check(
      "field_observations_target_ck",
      sql`${table.entityType} in (${entityTypes}) and ${table.fieldKey} in (${fieldKeys})`,
    ),
    check(
      "field_observations_hash_ck",
      sql`length(${table.comparisonHash}) = 64`,
    ),
    check(
      "field_observations_provenance_ck",
      sql`${table.provenanceKind} in (${sql.raw(sqlList(PROVENANCE_KINDS))})`,
    ),
    check(
      "field_observations_state_ck",
      sql`${table.state} in (${sql.raw(sqlList(OBSERVATION_STATES))})`,
    ),
    check(
      "field_observations_confidence_ck",
      sql`${table.mappingConfidence} between 0 and 1`,
    ),
    check(
      "field_observations_curated_ck",
      sql`${table.provenanceKind} <> 'curated'
        or (length(trim(${table.actorRef})) > 0 and length(trim(${table.reason})) > 0)`,
    ),
    check(
      "field_observations_derived_ck",
      sql`${table.provenanceKind} <> 'derived'
        or (
          length(trim(${table.derivationName})) > 0
          and length(trim(${table.derivationVersion})) > 0
          and ${table.parentIdsJson} is not null
        )`,
    ),
    index("field_observations_source_field_state_idx").on(
      table.sourceRecordId,
      table.fieldKey,
      table.state,
    ),
    index("field_observations_target_field_idx").on(
      table.entityType,
      table.entityId,
      table.fieldKey,
    ),
  ],
);

export const fieldResolutionsPg = pgTable(
  "field_resolutions",
  {
    id: text("id").primaryKey(),
    entityType: text("entity_type").notNull(),
    entityId: text("entity_id").notNull(),
    fieldKey: text("field_key").notNull(),
    selectedObservationId: text("selected_observation_id").references(
      () => fieldObservationsPg.id,
      { onDelete: "restrict" },
    ),
    state: text("state").notNull(),
    reason: text("reason").notNull(),
    previousResolutionId: text("previous_resolution_id").references(
      (): AnyPgColumn => fieldResolutionsPg.id,
      { onDelete: "restrict" },
    ),
    actorRef: text("actor_ref").notNull(),
    resolverVersion: text("resolver_version").notNull(),
    resolvedAt: timestamp("resolved_at").notNull(),
  },
  (table) => [
    check(
      "field_resolutions_target_ck",
      sql`${table.entityType} in (${entityTypes}) and ${table.fieldKey} in (${fieldKeys})`,
    ),
    check(
      "field_resolutions_state_ck",
      sql`${table.state} in (${sql.raw(sqlList(RESOLUTION_STATES))})`,
    ),
    check(
      "field_resolutions_selection_ck",
      sql`(
        ${table.state} in ('present', 'stale')
        and ${table.selectedObservationId} is not null
      ) or (
        ${table.state} in ('missing', 'conflicting', 'withdrawn')
        and ${table.selectedObservationId} is null
      )`,
    ),
    check(
      "field_resolutions_nonempty_ck",
      sql`length(trim(${table.reason})) > 0
        and length(trim(${table.actorRef})) > 0
        and length(trim(${table.resolverVersion})) > 0`,
    ),
    index("field_resolutions_target_history_idx").on(
      table.entityType,
      table.entityId,
      table.fieldKey,
      table.resolvedAt,
    ),
  ],
);

export const fieldResolutionHeadsPg = pgTable(
  "field_resolution_heads",
  {
    entityType: text("entity_type").notNull(),
    entityId: text("entity_id").notNull(),
    fieldKey: text("field_key").notNull(),
    resolutionId: text("resolution_id")
      .notNull()
      .references(() => fieldResolutionsPg.id, { onDelete: "restrict" }),
  },
  (table) => [
    primaryKey({
      name: "field_resolution_heads_pk",
      columns: [table.entityType, table.entityId, table.fieldKey],
    }),
    uniqueIndex("field_resolution_heads_resolution_uq").on(table.resolutionId),
    check(
      "field_resolution_heads_target_ck",
      sql`${table.entityType} in (${entityTypes}) and ${table.fieldKey} in (${fieldKeys})`,
    ),
    index("field_resolution_heads_lookup_idx").on(
      table.entityType,
      table.entityId,
      table.fieldKey,
    ),
  ],
);

export const descriptionCandidatesPg = pgTable(
  "description_candidates",
  {
    id: text("id").primaryKey(),
    workId: text("work_id")
      .notNull()
      .references(() => worksPg.id, { onDelete: "restrict" }),
    observationId: text("observation_id")
      .notNull()
      .references(() => fieldObservationsPg.id, { onDelete: "restrict" }),
    descriptionClass: text("description_class").notNull(),
    textContent: text("text_content").notNull(),
    textHash: text("text_hash").notNull(),
    sourceRevision: text("source_revision").notNull(),
    sourcePolicyVersion: text("source_policy_version").notNull(),
    descriptionPolicyVersion: text("description_policy_version").notNull(),
    licenseName: text("license_name"),
    licenseUrl: text("license_url"),
    attributionText: text("attribution_text"),
    derivativesPermitted: boolean("derivatives_permitted"),
    licensedSourceTextHash: text("licensed_source_text_hash"),
    licensedTextTransformed: boolean("licensed_text_transformed"),
    editorRef: text("editor_ref"),
    editorialReason: text("editorial_reason"),
    editorialRevision: text("editorial_revision"),
    modelId: text("model_id"),
    modelVersion: text("model_version"),
    promptVersion: text("prompt_version"),
    generationInputHash: text("generation_input_hash"),
    generatedAt: timestamp("generated_at"),
    generationDurationMs: timestamp("generation_duration_ms"),
    inputTokens: integer("input_tokens"),
    outputTokens: integer("output_tokens"),
    costMicrousd: timestamp("cost_microusd"),
    qualityScore: doublePrecision("quality_score"),
    ambiguousIdentity: boolean("ambiguous_identity").notNull().default(false),
    sensitiveContent: boolean("sensitive_content").notNull().default(false),
    createdAt: timestamp("created_at").notNull(),
  },
  (table) => [
    uniqueIndex("description_candidates_observation_uq").on(
      table.observationId,
    ),
    check(
      "description_candidates_class_ck",
      sql`${table.descriptionClass} in (${sql.raw(sqlList(DESCRIPTION_CLASSES))})`,
    ),
    check(
      "description_candidates_text_ck",
      sql`length(trim(${table.textContent})) > 0 and length(${table.textHash}) = 64`,
    ),
    check(
      "description_candidates_versions_ck",
      sql`length(trim(${table.sourceRevision})) > 0
        and length(trim(${table.sourcePolicyVersion})) > 0
        and length(trim(${table.descriptionPolicyVersion})) > 0`,
    ),
    check(
      "description_candidates_license_ck",
      sql`(
        ${table.descriptionClass} = 'licensed_verbatim'
        and length(trim(${table.licenseName})) > 0
        and length(trim(${table.licenseUrl})) > 0
        and ${table.derivativesPermitted} is not null
        and length(${table.licensedSourceTextHash}) = 64
        and ${table.licensedTextTransformed} is not null
      ) or (
        ${table.descriptionClass} <> 'licensed_verbatim'
        and ${table.licenseName} is null
        and ${table.licenseUrl} is null
        and ${table.attributionText} is null
        and ${table.derivativesPermitted} is null
        and ${table.licensedSourceTextHash} is null
        and ${table.licensedTextTransformed} is null
      )`,
    ),
    check(
      "description_candidates_editorial_ck",
      sql`(
        ${table.descriptionClass} = 'bukie_editorial'
        and length(trim(${table.editorRef})) > 0
        and length(trim(${table.editorialReason})) > 0
        and length(trim(${table.editorialRevision})) > 0
      ) or (
        ${table.descriptionClass} <> 'bukie_editorial'
        and ${table.editorRef} is null
        and ${table.editorialReason} is null
        and ${table.editorialRevision} is null
      )`,
    ),
    check(
      "description_candidates_model_ck",
      sql`(
        ${table.descriptionClass} = 'model_assisted_candidate'
        and length(trim(${table.modelId})) > 0
        and length(trim(${table.modelVersion})) > 0
        and length(trim(${table.promptVersion})) > 0
        and length(${table.generationInputHash}) = 64
        and ${table.generatedAt} is not null
        and ${table.generationDurationMs} >= 0
        and ${table.inputTokens} >= 0
        and ${table.outputTokens} >= 0
        and ${table.costMicrousd} >= 0
      ) or (
        ${table.descriptionClass} <> 'model_assisted_candidate'
        and ${table.modelId} is null
        and ${table.modelVersion} is null
        and ${table.promptVersion} is null
        and ${table.generationInputHash} is null
        and ${table.generatedAt} is null
        and ${table.generationDurationMs} is null
        and ${table.inputTokens} is null
        and ${table.outputTokens} is null
        and ${table.costMicrousd} is null
      )`,
    ),
    check(
      "description_candidates_quality_ck",
      sql`${table.qualityScore} is null or ${table.qualityScore} between 0 and 100`,
    ),
    index("description_candidates_work_created_idx").on(
      table.workId,
      table.createdAt,
    ),
  ],
);

export const descriptionClaimsPg = pgTable(
  "description_claims",
  {
    id: text("id").primaryKey(),
    candidateId: text("candidate_id")
      .notNull()
      .references(() => descriptionCandidatesPg.id, { onDelete: "cascade" }),
    position: integer("position").notNull(),
    claimText: text("claim_text").notNull(),
    claimHash: text("claim_hash").notNull(),
  },
  (table) => [
    uniqueIndex("description_claims_position_uq").on(
      table.candidateId,
      table.position,
    ),
    check(
      "description_claims_content_ck",
      sql`${table.position} >= 0
        and length(trim(${table.claimText})) > 0
        and length(${table.claimHash}) = 64`,
    ),
    index("description_claims_candidate_idx").on(table.candidateId),
  ],
);

export const descriptionClaimEvidencePg = pgTable(
  "description_claim_evidence",
  {
    claimId: text("claim_id")
      .notNull()
      .references(() => descriptionClaimsPg.id, { onDelete: "cascade" }),
    observationId: text("observation_id")
      .notNull()
      .references(() => fieldObservationsPg.id, { onDelete: "restrict" }),
  },
  (table) => [
    primaryKey({
      name: "description_claim_evidence_pk",
      columns: [table.claimId, table.observationId],
    }),
    index("description_claim_evidence_observation_idx").on(table.observationId),
  ],
);

export const descriptionDecisionsPg = pgTable(
  "description_decisions",
  {
    id: text("id").primaryKey(),
    candidateId: text("candidate_id")
      .notNull()
      .references(() => descriptionCandidatesPg.id, { onDelete: "restrict" }),
    state: text("state").notNull(),
    rejectionCodesJson: jsonb("rejection_codes_json").notNull(),
    warningCodesJson: jsonb("warning_codes_json").notNull(),
    reviewerRef: text("reviewer_ref"),
    reviewReason: text("review_reason"),
    previousDecisionId: text("previous_decision_id").references(
      (): AnyPgColumn => descriptionDecisionsPg.id,
      { onDelete: "restrict" },
    ),
    policyVersion: text("policy_version").notNull(),
    decidedAt: timestamp("decided_at").notNull(),
  },
  (table) => [
    check(
      "description_decisions_state_ck",
      sql`${table.state} in (${sql.raw(sqlList(DESCRIPTION_DECISION_STATES))})`,
    ),
    check(
      "description_decisions_review_ck",
      sql`(${table.reviewerRef} is null and ${table.reviewReason} is null)
        or (
          length(trim(${table.reviewerRef})) > 0
          and length(trim(${table.reviewReason})) > 0
        )`,
    ),
    check(
      "description_decisions_policy_ck",
      sql`length(trim(${table.policyVersion})) > 0`,
    ),
    index("description_decisions_candidate_history_idx").on(
      table.candidateId,
      table.decidedAt,
    ),
  ],
);

export const descriptionDecisionHeadsPg = pgTable(
  "description_decision_heads",
  {
    candidateId: text("candidate_id")
      .primaryKey()
      .references(() => descriptionCandidatesPg.id, { onDelete: "restrict" }),
    decisionId: text("decision_id")
      .notNull()
      .references(() => descriptionDecisionsPg.id, { onDelete: "restrict" }),
  },
  (table) => [
    uniqueIndex("description_decision_heads_decision_uq").on(table.decisionId),
  ],
);

export const descriptionReviewQueuePg = pgTable(
  "description_review_queue",
  {
    candidateId: text("candidate_id")
      .primaryKey()
      .references(() => descriptionCandidatesPg.id, { onDelete: "restrict" }),
    state: text("state").notNull(),
    priority: integer("priority").notNull(),
    reasonCodesJson: jsonb("reason_codes_json").notNull(),
    queuedAt: timestamp("queued_at").notNull(),
    updatedAt: timestamp("updated_at").notNull(),
    reviewerRef: text("reviewer_ref"),
  },
  (table) => [
    check(
      "description_review_queue_state_ck",
      sql`${table.state} in (${sql.raw(sqlList(DESCRIPTION_QUEUE_STATES))})`,
    ),
    check(
      "description_review_queue_values_ck",
      sql`${table.priority} >= 0
        and (${table.reviewerRef} is null or length(trim(${table.reviewerRef})) > 0)`,
    ),
    index("description_review_queue_active_idx").on(
      table.state,
      table.priority,
      table.queuedAt,
    ),
  ],
);

export const descriptionProjectionsPg = pgTable(
  "description_projections",
  {
    id: text("id").primaryKey(),
    workId: text("work_id")
      .notNull()
      .references(() => worksPg.id, { onDelete: "restrict" }),
    candidateId: text("candidate_id").references(
      () => descriptionCandidatesPg.id,
      { onDelete: "restrict" },
    ),
    state: text("state").notNull(),
    previousProjectionId: text("previous_projection_id").references(
      (): AnyPgColumn => descriptionProjectionsPg.id,
      { onDelete: "restrict" },
    ),
    reasonCode: text("reason_code").notNull(),
    actorRef: text("actor_ref").notNull(),
    policyVersion: text("policy_version").notNull(),
    projectedAt: timestamp("projected_at").notNull(),
  },
  (table) => [
    check(
      "description_projections_state_ck",
      sql`${table.state} in (${sql.raw(sqlList(DESCRIPTION_PROJECTION_STATES))})`,
    ),
    check(
      "description_projections_selection_ck",
      sql`(${table.state} in ('selected', 'rolled_back') and ${table.candidateId} is not null)
        or (${table.state} in ('withdrawn', 'invalidated') and ${table.candidateId} is null)`,
    ),
    check(
      "description_projections_nonempty_ck",
      sql`length(trim(${table.reasonCode})) > 0
        and length(trim(${table.actorRef})) > 0
        and length(trim(${table.policyVersion})) > 0`,
    ),
    index("description_projections_work_history_idx").on(
      table.workId,
      table.projectedAt,
    ),
  ],
);

export const descriptionProjectionHeadsPg = pgTable(
  "description_projection_heads",
  {
    workId: text("work_id")
      .primaryKey()
      .references(() => worksPg.id, { onDelete: "restrict" }),
    projectionId: text("projection_id")
      .notNull()
      .references(() => descriptionProjectionsPg.id, { onDelete: "restrict" }),
  },
  (table) => [
    uniqueIndex("description_projection_heads_projection_uq").on(
      table.projectionId,
    ),
  ],
);

export const entityAliasesPg = pgTable(
  "entity_aliases",
  {
    entityType: text("entity_type").notNull(),
    fromId: text("from_id").notNull(),
    toId: text("to_id").notNull(),
    reason: text("reason").notNull(),
    createdAt: timestamp("created_at").notNull(),
  },
  (table) => [
    primaryKey({
      name: "entity_aliases_pk",
      columns: [table.entityType, table.fromId],
    }),
    check(
      "entity_aliases_ck",
      sql`${table.entityType} in (${entityTypes})
        and ${table.fromId} <> ${table.toId}
        and length(trim(${table.reason})) > 0`,
    ),
    index("entity_aliases_target_idx").on(table.entityType, table.toId),
  ],
);

export const catalogChangeEventsPg = pgTable(
  "catalog_change_events",
  {
    id: text("id").primaryKey(),
    changeType: text("change_type").notNull(),
    actorRef: text("actor_ref").notNull(),
    payloadJson: jsonb("payload_json").notNull(),
    reason: text("reason").notNull(),
    createdAt: timestamp("created_at").notNull(),
  },
  (table) => [
    check(
      "catalog_change_events_type_ck",
      sql`${table.changeType} in (${sql.raw(sqlList(CHANGE_TYPES))})`,
    ),
    check(
      "catalog_change_events_nonempty_ck",
      sql`length(trim(${table.actorRef})) > 0 and length(trim(${table.reason})) > 0`,
    ),
    index("catalog_change_events_type_created_idx").on(
      table.changeType,
      table.createdAt,
    ),
  ],
);

export const catalogPostgresTables = {
  metadataSources: metadataSourcesPg,
  works: worksPg,
  editions: editionsPg,
  authors: authorsPg,
  workAuthors: workAuthorsPg,
  categories: categoriesPg,
  workCategories: workCategoriesPg,
  publishers: publishersPg,
  editionPublishers: editionPublishersPg,
  languages: languagesPg,
  editionLanguages: editionLanguagesPg,
  editionIdentifiers: editionIdentifiersPg,
  coverAssets: coverAssetsPg,
  editionCovers: editionCoversPg,
  sourceRecords: sourceRecordsPg,
  sourceRecordLinks: sourceRecordLinksPg,
  fieldObservations: fieldObservationsPg,
  fieldResolutions: fieldResolutionsPg,
  fieldResolutionHeads: fieldResolutionHeadsPg,
  descriptionCandidates: descriptionCandidatesPg,
  descriptionClaims: descriptionClaimsPg,
  descriptionClaimEvidence: descriptionClaimEvidencePg,
  descriptionDecisions: descriptionDecisionsPg,
  descriptionDecisionHeads: descriptionDecisionHeadsPg,
  descriptionReviewQueue: descriptionReviewQueuePg,
  descriptionProjections: descriptionProjectionsPg,
  descriptionProjectionHeads: descriptionProjectionHeadsPg,
  entityAliases: entityAliasesPg,
  catalogChangeEvents: catalogChangeEventsPg,
};
