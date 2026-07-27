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
  entityAliases: entityAliasesPg,
  catalogChangeEvents: catalogChangeEventsPg,
};
