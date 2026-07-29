import { sql as drizzleSql, eq } from "drizzle-orm";
import { drizzle } from "drizzle-orm/postgres-js";
import { migrate } from "drizzle-orm/postgres-js/migrator";
import postgres from "postgres";
import { canonicalJson, sha256 } from "./identity";
import type { CatalogImportGraph } from "./importer";
import {
  authorsPg,
  catalogChangeEventsPg,
  categoriesPg,
  coverAssetsPg,
  editionCoversPg,
  editionIdentifiersPg,
  editionLanguagesPg,
  editionPublishersPg,
  editionsPg,
  entityAliasesPg,
  fieldObservationsPg,
  fieldResolutionHeadsPg,
  fieldResolutionsPg,
  languagesPg,
  metadataSourcesPg,
  publishersPg,
  sourceRecordLinksPg,
  sourceRecordsPg,
  workAuthorsPg,
  workCategoriesPg,
  worksPg,
} from "./schema.pg";
import { CATALOG_TARGET_TABLE_NAMES } from "./sqlite-rebuild";

const CLEAR_TABLES = [
  "description_projection_heads",
  "description_projections",
  "description_review_queue",
  "description_decision_heads",
  "description_decisions",
  "description_claim_evidence",
  "description_claims",
  "description_candidates",
  "field_resolution_heads",
  "field_resolutions",
  "field_observations",
  "source_record_links",
  "entity_aliases",
  "catalog_change_events",
  "edition_covers",
  "edition_identifiers",
  "edition_languages",
  "edition_publishers",
  "work_authors",
  "work_categories",
  "editions",
  "works",
  "authors",
  "categories",
  "publishers",
  "languages",
  "cover_assets",
  "source_records",
  "metadata_sources",
] as const;

function chunks<T>(rows: T[], size = 100): T[][] {
  const result: T[][] = [];
  for (let index = 0; index < rows.length; index += size) {
    result.push(rows.slice(index, index + size));
  }
  return result;
}

function parseJson(value: unknown): unknown {
  return typeof value === "string" ? JSON.parse(value) : value;
}

export async function rebuildCatalogPostgres(input: {
  url: string;
  graph: CatalogImportGraph;
  failAfterTable?: keyof CatalogImportGraph;
  seedExistingSchema?: boolean;
}) {
  const client = postgres(input.url, { max: 1 });
  const db = drizzle(client);
  const graph = input.graph;
  try {
    if (!input.seedExistingSchema) {
      await migrate(db, { migrationsFolder: "drizzle/pg" });
    }
    await db.transaction(async (tx) => {
      if (input.seedExistingSchema) {
        await tx.execute(
          drizzleSql`lock table works in share row exclusive mode`,
        );
        const existing = await tx
          .select({ id: worksPg.id })
          .from(worksPg)
          .limit(1);
        if (existing.length > 0) return;
      } else {
        await tx.execute(
          drizzleSql.raw(
            `truncate table ${CLEAR_TABLES.map((table) => `"${table}"`).join(", ")} cascade`,
          ),
        );
      }
      const maybeFail = (table: keyof CatalogImportGraph) => {
        if (input.failAfterTable === table) {
          throw new Error(`Forced catalog importer failure after ${table}`);
        }
      };

      for (const batch of chunks(
        graph.metadataSources.map((row) => ({
          ...(row as typeof metadataSourcesPg.$inferInsert),
          metadataPolicy: parseJson(row.metadataPolicy),
          assetPolicy: parseJson(row.assetPolicy),
        })),
      )) {
        await tx.insert(metadataSourcesPg).values(batch).onConflictDoNothing();
      }
      maybeFail("metadataSources");

      for (const batch of chunks(
        graph.works.map((row) => ({
          ...(row as typeof worksPg.$inferInsert),
          preferredEditionId: null,
        })),
      )) {
        await tx.insert(worksPg).values(batch).onConflictDoNothing();
      }
      maybeFail("works");

      for (const batch of chunks(
        graph.editions as (typeof editionsPg.$inferInsert)[],
      )) {
        await tx.insert(editionsPg).values(batch).onConflictDoNothing();
      }
      maybeFail("editions");
      for (const row of graph.works as (typeof worksPg.$inferInsert)[]) {
        if (!row.preferredEditionId) continue;
        await tx
          .update(worksPg)
          .set({ preferredEditionId: row.preferredEditionId })
          .where(eq(worksPg.id, row.id));
      }

      for (const batch of chunks(
        graph.authors as (typeof authorsPg.$inferInsert)[],
      )) {
        await tx.insert(authorsPg).values(batch).onConflictDoNothing();
      }
      maybeFail("authors");
      for (const batch of chunks(
        graph.categories as (typeof categoriesPg.$inferInsert)[],
      )) {
        await tx.insert(categoriesPg).values(batch).onConflictDoNothing();
      }
      maybeFail("categories");
      for (const batch of chunks(
        graph.publishers as (typeof publishersPg.$inferInsert)[],
      )) {
        await tx.insert(publishersPg).values(batch).onConflictDoNothing();
      }
      maybeFail("publishers");
      for (const batch of chunks(
        graph.languages as (typeof languagesPg.$inferInsert)[],
      )) {
        await tx.insert(languagesPg).values(batch).onConflictDoNothing();
      }
      maybeFail("languages");
      for (const batch of chunks(
        graph.coverAssets as (typeof coverAssetsPg.$inferInsert)[],
      )) {
        await tx.insert(coverAssetsPg).values(batch).onConflictDoNothing();
      }
      maybeFail("coverAssets");
      for (const batch of chunks(
        graph.workAuthors as (typeof workAuthorsPg.$inferInsert)[],
      )) {
        await tx.insert(workAuthorsPg).values(batch).onConflictDoNothing();
      }
      maybeFail("workAuthors");
      for (const batch of chunks(
        graph.workCategories as (typeof workCategoriesPg.$inferInsert)[],
      )) {
        await tx.insert(workCategoriesPg).values(batch).onConflictDoNothing();
      }
      maybeFail("workCategories");
      for (const batch of chunks(
        graph.editionPublishers as (typeof editionPublishersPg.$inferInsert)[],
      )) {
        await tx
          .insert(editionPublishersPg)
          .values(batch)
          .onConflictDoNothing();
      }
      maybeFail("editionPublishers");
      for (const batch of chunks(
        graph.editionLanguages as (typeof editionLanguagesPg.$inferInsert)[],
      )) {
        await tx.insert(editionLanguagesPg).values(batch).onConflictDoNothing();
      }
      maybeFail("editionLanguages");
      for (const batch of chunks(
        graph.editionIdentifiers as (typeof editionIdentifiersPg.$inferInsert)[],
      )) {
        await tx
          .insert(editionIdentifiersPg)
          .values(batch)
          .onConflictDoNothing();
      }
      maybeFail("editionIdentifiers");
      for (const batch of chunks(
        graph.editionCovers as (typeof editionCoversPg.$inferInsert)[],
      )) {
        await tx.insert(editionCoversPg).values(batch).onConflictDoNothing();
      }
      maybeFail("editionCovers");

      for (const batch of chunks(
        graph.sourceRecords.map((row) => ({
          ...(row as typeof sourceRecordsPg.$inferInsert),
          payloadJson:
            row.payloadJson === null ? null : parseJson(row.payloadJson),
        })),
      )) {
        await tx.insert(sourceRecordsPg).values(batch).onConflictDoNothing();
      }
      maybeFail("sourceRecords");
      for (const batch of chunks(
        graph.sourceRecordLinks as (typeof sourceRecordLinksPg.$inferInsert)[],
      )) {
        await tx
          .insert(sourceRecordLinksPg)
          .values(batch)
          .onConflictDoNothing();
      }
      maybeFail("sourceRecordLinks");

      for (const batch of chunks(
        graph.fieldObservations.map((row) => ({
          ...(row as typeof fieldObservationsPg.$inferInsert),
          valueJson: parseJson(row.valueJson),
          parentIdsJson:
            row.parentIdsJson === null ? null : parseJson(row.parentIdsJson),
        })),
      )) {
        await tx
          .insert(fieldObservationsPg)
          .values(batch)
          .onConflictDoNothing();
      }
      maybeFail("fieldObservations");
      for (const batch of chunks(
        graph.fieldResolutions as (typeof fieldResolutionsPg.$inferInsert)[],
      )) {
        await tx.insert(fieldResolutionsPg).values(batch).onConflictDoNothing();
      }
      maybeFail("fieldResolutions");
      for (const batch of chunks(
        graph.fieldResolutionHeads as (typeof fieldResolutionHeadsPg.$inferInsert)[],
      )) {
        await tx
          .insert(fieldResolutionHeadsPg)
          .values(batch)
          .onConflictDoNothing();
      }
      maybeFail("fieldResolutionHeads");
      for (const batch of chunks(
        graph.entityAliases as (typeof entityAliasesPg.$inferInsert)[],
      )) {
        await tx.insert(entityAliasesPg).values(batch).onConflictDoNothing();
      }
      maybeFail("entityAliases");
      for (const batch of chunks(
        graph.catalogChangeEvents.map((row) => ({
          ...(row as typeof catalogChangeEventsPg.$inferInsert),
          payloadJson: parseJson(row.payloadJson),
        })),
      )) {
        await tx
          .insert(catalogChangeEventsPg)
          .values(batch)
          .onConflictDoNothing();
      }
      maybeFail("catalogChangeEvents");
    });
  } finally {
    await client.end({ timeout: 5_000 });
  }
}

/**
 * Populate an already-migrated, empty normalized schema before the guarded
 * legacy-table drop migration runs. This never clears normalized rows.
 */
export async function seedCatalogPostgresExistingSchema(input: {
  url: string;
  graph: CatalogImportGraph;
}) {
  return rebuildCatalogPostgres({
    ...input,
    seedExistingSchema: true,
  });
}

export async function catalogPostgresSnapshot(url: string) {
  const client = postgres(url, { max: 1 });
  try {
    const tables: Record<string, unknown[]> = {};
    for (const table of CATALOG_TARGET_TABLE_NAMES) {
      const rows = await client.unsafe(`select * from "${table}"`);
      const normalized = [...rows].map((row) => ({ ...row }));
      normalized.sort((left, right) =>
        canonicalJson(left).localeCompare(canonicalJson(right)),
      );
      tables[table] = normalized;
    }
    return { hash: sha256(canonicalJson(tables)), tables };
  } finally {
    await client.end({ timeout: 5_000 });
  }
}
