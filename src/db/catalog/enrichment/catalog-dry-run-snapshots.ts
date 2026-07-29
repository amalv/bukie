import type Database from "better-sqlite3";
import postgres from "postgres";
import { canonicalJson, hashCanonicalJson } from "../identity";
import type { CatalogDryRunProtectedHashes } from "./catalog-dry-run";

type SqliteDatabase = InstanceType<typeof Database>;

const READER_TABLES = [
  "works",
  "editions",
  "authors",
  "work_authors",
  "categories",
  "work_categories",
  "publishers",
  "edition_publishers",
  "languages",
  "edition_languages",
  "edition_identifiers",
] as const;

const INTEGER64_COLUMNS = new Set([
  "bytes",
  "byte_size",
  "cataloged_at",
  "created_at",
  "decided_at",
  "generated_at",
  "inspected_at",
  "projected_at",
  "queued_at",
  "resolved_at",
  "retrieved_at",
  "reviewed_at",
  "source_modified_at",
  "updated_at",
]);

const normalizeValue = (key: string, value: unknown): unknown => {
  if (typeof value === "boolean") return value ? 1 : 0;
  if (
    typeof value === "string" &&
    INTEGER64_COLUMNS.has(key) &&
    /^-?\d+$/u.test(value)
  ) {
    const number = Number(value);
    return Number.isSafeInteger(number) ? number : value;
  }
  if (typeof value === "bigint") {
    const number = Number(value);
    return Number.isSafeInteger(number) ? number : value.toString();
  }
  if (value instanceof Date) return value.getTime();
  return value;
};

const normalizeRow = (
  row: Readonly<Record<string, unknown>>,
): Record<string, unknown> =>
  Object.fromEntries(
    Object.entries(row).map(([key, value]) => [
      key,
      normalizeValue(key, value),
    ]),
  );

const sortedRows = (rows: readonly Record<string, unknown>[]) =>
  rows
    .map(normalizeRow)
    .sort((left, right) =>
      canonicalJson(left).localeCompare(canonicalJson(right)),
    );

const hashRows = (rows: readonly Record<string, unknown>[]): string =>
  hashCanonicalJson(sortedRows(rows));

const sqliteRows = (
  raw: SqliteDatabase,
  statement: string,
): Record<string, unknown>[] =>
  raw.prepare(statement).all() as Record<string, unknown>[];

const sqliteReaderCatalog = (raw: SqliteDatabase) =>
  Object.fromEntries(
    READER_TABLES.map((table) => [
      table,
      sortedRows(sqliteRows(raw, `select * from "${table}"`)),
    ]),
  );

export const catalogDryRunProtectedHashesSqlite = (
  raw: SqliteDatabase,
): CatalogDryRunProtectedHashes => ({
  currentResolutionHeads: hashRows(
    sqliteRows(
      raw,
      `select entity_type, entity_id, field_key, resolution_id
       from field_resolution_heads`,
    ),
  ),
  descriptionProjections: hashCanonicalJson({
    heads: sortedRows(
      sqliteRows(raw, "select * from description_projection_heads"),
    ),
    projections: sortedRows(
      sqliteRows(raw, "select * from description_projections"),
    ),
  }),
  firstPublicationProjections: hashRows(
    sqliteRows(
      raw,
      `select id, first_publication_date, first_publication_precision,
              first_publication_sort_date
       from works`,
    ),
  ),
  publicCoverRelationsAssets: hashCanonicalJson({
    assets: sortedRows(sqliteRows(raw, "select * from cover_assets")),
    relations: sortedRows(sqliteRows(raw, "select * from edition_covers")),
  }),
  coverPointers: hashCanonicalJson({
    editions: sortedRows(sqliteRows(raw, "select id, work_id from editions")),
    preferredEditions: sortedRows(
      sqliteRows(raw, "select id, preferred_edition_id from works"),
    ),
    relations: sortedRows(sqliteRows(raw, "select * from edition_covers")),
  }),
  readerFacingCatalog: hashCanonicalJson(sqliteReaderCatalog(raw)),
});

const postgresRows = async (
  client: postgres.Sql,
  statement: string,
): Promise<Record<string, unknown>[]> =>
  (await client.unsafe(statement)).map((row) => ({ ...row }));

const postgresReaderCatalog = async (client: postgres.Sql) => {
  const entries = await Promise.all(
    READER_TABLES.map(async (table) => [
      table,
      sortedRows(await postgresRows(client, `select * from "${table}"`)),
    ]),
  );
  return Object.fromEntries(entries);
};

export const catalogDryRunProtectedHashesPostgres = async (
  url: string,
): Promise<CatalogDryRunProtectedHashes> => {
  const client = postgres(url, { max: 1 });
  try {
    const [
      heads,
      descriptionHeads,
      descriptionProjections,
      firstPublication,
      assets,
      coverRelations,
      editions,
      preferredEditions,
      readerCatalog,
    ] = await Promise.all([
      postgresRows(
        client,
        `select entity_type, entity_id, field_key, resolution_id
         from field_resolution_heads`,
      ),
      postgresRows(client, "select * from description_projection_heads"),
      postgresRows(client, "select * from description_projections"),
      postgresRows(
        client,
        `select id, first_publication_date, first_publication_precision,
                first_publication_sort_date
         from works`,
      ),
      postgresRows(client, "select * from cover_assets"),
      postgresRows(client, "select * from edition_covers"),
      postgresRows(client, "select id, work_id from editions"),
      postgresRows(client, "select id, preferred_edition_id from works"),
      postgresReaderCatalog(client),
    ]);
    return {
      currentResolutionHeads: hashRows(heads),
      descriptionProjections: hashCanonicalJson({
        heads: sortedRows(descriptionHeads),
        projections: sortedRows(descriptionProjections),
      }),
      firstPublicationProjections: hashRows(firstPublication),
      publicCoverRelationsAssets: hashCanonicalJson({
        assets: sortedRows(assets),
        relations: sortedRows(coverRelations),
      }),
      coverPointers: hashCanonicalJson({
        editions: sortedRows(editions),
        preferredEditions: sortedRows(preferredEditions),
        relations: sortedRows(coverRelations),
      }),
      readerFacingCatalog: hashCanonicalJson(readerCatalog),
    };
  } finally {
    await client.end({ timeout: 5_000 });
  }
};
