import { mkdirSync } from "node:fs";
import path from "node:path";
import Database from "better-sqlite3";
import { drizzle } from "drizzle-orm/better-sqlite3";
import { migrate } from "drizzle-orm/better-sqlite3/migrator";
import { canonicalJson, sha256 } from "./identity";
import type { CatalogImportGraph } from "./importer";
import {
  authors,
  catalogChangeEvents,
  categories,
  coverAssets,
  editionCovers,
  editionIdentifiers,
  editionLanguages,
  editionPublishers,
  editions,
  entityAliases,
  fieldObservations,
  fieldResolutionHeads,
  fieldResolutions,
  languages,
  metadataSources,
  publishers,
  sourceRecordLinks,
  sourceRecords,
  workAuthors,
  workCategories,
  works,
} from "./schema";

export const CATALOG_TARGET_TABLE_NAMES = [
  "authors",
  "catalog_change_events",
  "categories",
  "cover_assets",
  "edition_covers",
  "edition_identifiers",
  "edition_languages",
  "edition_publishers",
  "editions",
  "entity_aliases",
  "field_observations",
  "field_resolution_heads",
  "field_resolutions",
  "languages",
  "metadata_sources",
  "publishers",
  "source_record_links",
  "source_records",
  "work_authors",
  "work_categories",
  "works",
] as const;

const CLEAR_SQL = `
  delete from field_resolution_heads;
  delete from field_resolutions;
  delete from field_observations;
  delete from source_record_links;
  delete from entity_aliases;
  delete from catalog_change_events;
  delete from edition_covers;
  delete from edition_identifiers;
  delete from edition_languages;
  delete from edition_publishers;
  delete from work_authors;
  delete from work_categories;
  delete from editions;
  delete from works;
  delete from authors;
  delete from categories;
  delete from publishers;
  delete from languages;
  delete from cover_assets;
  delete from source_records;
  delete from metadata_sources;
`;

function chunks<T>(rows: T[], size = 20): T[][] {
  const result: T[][] = [];
  for (let index = 0; index < rows.length; index += size) {
    result.push(rows.slice(index, index + size));
  }
  return result;
}

export function openCatalogSqlite(sqlitePath: string) {
  mkdirSync(path.dirname(sqlitePath), { recursive: true });
  const raw = new Database(sqlitePath);
  raw.pragma("foreign_keys = ON");
  const db = drizzle(raw);
  return { raw, db };
}

export function migrateCatalogSqlite(raw: InstanceType<typeof Database>) {
  migrate(drizzle(raw), { migrationsFolder: "drizzle" });
  raw.pragma("foreign_keys = ON");
}

export function importCatalogGraphSqlite(
  raw: InstanceType<typeof Database>,
  graph: CatalogImportGraph,
  options: { failAfterTable?: keyof CatalogImportGraph } = {},
) {
  const db = drizzle(raw);
  const maybeFail = (table: keyof CatalogImportGraph) => {
    if (options.failAfterTable === table) {
      throw new Error(`Forced catalog importer failure after ${table}`);
    }
  };
  const insert = <T>(
    rows: T[],
    operation: (batch: T[]) => unknown,
    table: keyof CatalogImportGraph,
  ) => {
    for (const batch of chunks(rows)) operation(batch);
    maybeFail(table);
  };

  insert(
    graph.metadataSources as (typeof metadataSources.$inferInsert)[],
    (batch) =>
      db.insert(metadataSources).values(batch).onConflictDoNothing().run(),
    "metadataSources",
  );
  insert(
    graph.works.map((row) => ({
      ...(row as typeof works.$inferInsert),
      preferredEditionId: null,
    })),
    (batch) => db.insert(works).values(batch).onConflictDoNothing().run(),
    "works",
  );
  insert(
    graph.editions as (typeof editions.$inferInsert)[],
    (batch) => db.insert(editions).values(batch).onConflictDoNothing().run(),
    "editions",
  );
  for (const row of graph.works as (typeof works.$inferInsert)[]) {
    if (!row.preferredEditionId) continue;
    raw
      .prepare("update works set preferred_edition_id = ? where id = ?")
      .run(row.preferredEditionId, row.id);
  }
  insert(
    graph.authors as (typeof authors.$inferInsert)[],
    (batch) => db.insert(authors).values(batch).onConflictDoNothing().run(),
    "authors",
  );
  insert(
    graph.categories as (typeof categories.$inferInsert)[],
    (batch) => db.insert(categories).values(batch).onConflictDoNothing().run(),
    "categories",
  );
  insert(
    graph.publishers as (typeof publishers.$inferInsert)[],
    (batch) => db.insert(publishers).values(batch).onConflictDoNothing().run(),
    "publishers",
  );
  insert(
    graph.languages as (typeof languages.$inferInsert)[],
    (batch) => db.insert(languages).values(batch).onConflictDoNothing().run(),
    "languages",
  );
  insert(
    graph.coverAssets as (typeof coverAssets.$inferInsert)[],
    (batch) => db.insert(coverAssets).values(batch).onConflictDoNothing().run(),
    "coverAssets",
  );
  insert(
    graph.workAuthors as (typeof workAuthors.$inferInsert)[],
    (batch) => db.insert(workAuthors).values(batch).onConflictDoNothing().run(),
    "workAuthors",
  );
  insert(
    graph.workCategories as (typeof workCategories.$inferInsert)[],
    (batch) =>
      db.insert(workCategories).values(batch).onConflictDoNothing().run(),
    "workCategories",
  );
  insert(
    graph.editionPublishers as (typeof editionPublishers.$inferInsert)[],
    (batch) =>
      db.insert(editionPublishers).values(batch).onConflictDoNothing().run(),
    "editionPublishers",
  );
  insert(
    graph.editionLanguages as (typeof editionLanguages.$inferInsert)[],
    (batch) =>
      db.insert(editionLanguages).values(batch).onConflictDoNothing().run(),
    "editionLanguages",
  );
  insert(
    graph.editionIdentifiers as (typeof editionIdentifiers.$inferInsert)[],
    (batch) =>
      db.insert(editionIdentifiers).values(batch).onConflictDoNothing().run(),
    "editionIdentifiers",
  );
  insert(
    graph.editionCovers as (typeof editionCovers.$inferInsert)[],
    (batch) =>
      db.insert(editionCovers).values(batch).onConflictDoNothing().run(),
    "editionCovers",
  );
  insert(
    graph.sourceRecords as (typeof sourceRecords.$inferInsert)[],
    (batch) =>
      db.insert(sourceRecords).values(batch).onConflictDoNothing().run(),
    "sourceRecords",
  );
  insert(
    graph.sourceRecordLinks as (typeof sourceRecordLinks.$inferInsert)[],
    (batch) =>
      db.insert(sourceRecordLinks).values(batch).onConflictDoNothing().run(),
    "sourceRecordLinks",
  );
  insert(
    graph.fieldObservations as (typeof fieldObservations.$inferInsert)[],
    (batch) =>
      db.insert(fieldObservations).values(batch).onConflictDoNothing().run(),
    "fieldObservations",
  );
  insert(
    graph.fieldResolutions as (typeof fieldResolutions.$inferInsert)[],
    (batch) =>
      db.insert(fieldResolutions).values(batch).onConflictDoNothing().run(),
    "fieldResolutions",
  );
  insert(
    graph.fieldResolutionHeads as (typeof fieldResolutionHeads.$inferInsert)[],
    (batch) =>
      db.insert(fieldResolutionHeads).values(batch).onConflictDoNothing().run(),
    "fieldResolutionHeads",
  );
  insert(
    graph.entityAliases as (typeof entityAliases.$inferInsert)[],
    (batch) =>
      db.insert(entityAliases).values(batch).onConflictDoNothing().run(),
    "entityAliases",
  );
  insert(
    graph.catalogChangeEvents as (typeof catalogChangeEvents.$inferInsert)[],
    (batch) =>
      db.insert(catalogChangeEvents).values(batch).onConflictDoNothing().run(),
    "catalogChangeEvents",
  );
}

export function rebuildCatalogSqlite(input: {
  sqlitePath: string;
  graph: CatalogImportGraph;
  failAfterTable?: keyof CatalogImportGraph;
}) {
  const { raw } = openCatalogSqlite(input.sqlitePath);
  try {
    migrateCatalogSqlite(raw);
    const rebuild = raw.transaction(() => {
      raw.exec(CLEAR_SQL);
      importCatalogGraphSqlite(raw, input.graph, {
        failAfterTable: input.failAfterTable,
      });
    });
    rebuild.immediate();
    return catalogSqliteSnapshot(raw);
  } finally {
    raw.close();
  }
}

export function catalogSqliteSnapshot(raw: InstanceType<typeof Database>): {
  hash: string;
  tables: Record<string, unknown[]>;
} {
  const tables: Record<string, unknown[]> = {};
  for (const table of CATALOG_TARGET_TABLE_NAMES) {
    const rows = raw.prepare(`select * from "${table}"`).all();
    rows.sort((left, right) =>
      canonicalJson(left).localeCompare(canonicalJson(right)),
    );
    tables[table] = rows;
  }
  return { hash: sha256(canonicalJson(tables)), tables };
}
