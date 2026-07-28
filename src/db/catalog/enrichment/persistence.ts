import type Database from "better-sqlite3";
import { and, eq } from "drizzle-orm";
import { drizzle } from "drizzle-orm/better-sqlite3";
import { canonicalJson, hashCanonicalJson } from "../identity";
import {
  fieldObservations,
  fieldResolutionHeads,
  metadataSources,
  sourceRecordLinks,
  sourceRecords,
} from "../schema";
import type { EnrichmentRunArtifact } from "./types";

export type EnrichmentPersistenceRows = {
  metadataSources: Record<string, unknown>[];
  sourceRecords: Record<string, unknown>[];
  sourceRecordLinks: Record<string, unknown>[];
  fieldObservations: Record<string, unknown>[];
};

const SEMANTIC_ROW_KEYS = {
  metadataSources: [
    "id",
    "key",
    "name",
    "termsUrl",
    "attributionUrl",
    "reviewedAt",
    "approvalState",
    "metadataPolicy",
    "assetPolicy",
    "payloadPolicy",
    "refreshIntervalMs",
  ],
  sourceRecords: [
    "id",
    "sourceId",
    "recordKey",
    "sourceRevision",
    "sourceModifiedAt",
    "payloadJson",
    "payloadHash",
    "importerVersion",
    "sourceRowHash",
    "state",
  ],
  sourceRecordLinks: [
    "sourceRecordId",
    "entityType",
    "entityId",
    "matchKind",
    "mappingConfidence",
    "state",
    "actorRef",
    "reason",
  ],
  fieldObservations: [
    "id",
    "sourceRecordId",
    "entityType",
    "entityId",
    "fieldKey",
    "valueJson",
    "comparisonHash",
    "provenanceKind",
    "sourcePath",
    "sourceModifiedAt",
    "mappingConfidence",
    "state",
    "actorRef",
    "reason",
    "derivationName",
    "derivationVersion",
    "parentIdsJson",
  ],
} as const satisfies Record<keyof EnrichmentPersistenceRows, readonly string[]>;

function projectedRow(
  row: Readonly<Record<string, unknown>>,
  keys: readonly string[],
): Record<string, unknown> {
  return Object.fromEntries(keys.map((key) => [key, row[key]]));
}

export function assertEnrichmentPersistenceRow(
  table: keyof EnrichmentPersistenceRows,
  expected: Readonly<Record<string, unknown>>,
  actual: Readonly<Record<string, unknown>> | undefined,
  identity: string,
): void {
  if (!actual) {
    throw new Error(
      `Enrichment persistence conflict: ${table} row ${identity} was not persisted`,
    );
  }
  const keys = SEMANTIC_ROW_KEYS[table];
  if (
    canonicalJson(projectedRow(expected, keys)) !==
    canonicalJson(projectedRow(actual, keys))
  ) {
    throw new Error(
      `Enrichment persistence conflict: immutable ${table} row ${identity} differs from the recorded revision`,
    );
  }
}

function parseJson(value: unknown): unknown {
  return typeof value === "string" ? JSON.parse(value) : value;
}

export function prepareEnrichmentPersistenceRows(
  run: EnrichmentRunArtifact,
  dialect: "sqlite" | "postgres",
): EnrichmentPersistenceRows {
  const json = (value: unknown) =>
    dialect === "postgres" ? parseJson(value) : value;
  return {
    metadataSources: run.metadataSources.map((row) => ({
      ...row,
      metadataPolicy: json(row.metadataPolicy),
      assetPolicy: json(row.assetPolicy),
    })),
    sourceRecords: run.sourceRecords.map(
      ({ upstreamRecordKey: _, ...row }) => ({
        ...row,
        payloadJson: row.payloadJson === null ? null : json(row.payloadJson),
      }),
    ),
    sourceRecordLinks: run.sourceRecordLinks.map(
      ({ id: _, outcome: __, ...row }) => row,
    ),
    fieldObservations: run.fieldObservations.map((row) => ({
      ...row,
      valueJson: json(row.valueJson),
      parentIdsJson:
        row.parentIdsJson === null ? null : json(row.parentIdsJson),
    })),
  };
}

function rowCount(
  raw: InstanceType<typeof Database>,
  table: keyof EnrichmentPersistenceRows,
): number {
  const tableName = {
    metadataSources: "metadata_sources",
    sourceRecords: "source_records",
    sourceRecordLinks: "source_record_links",
    fieldObservations: "field_observations",
  }[table];
  return Number(
    (
      raw.prepare(`select count(*) as count from ${tableName}`).get() as {
        count: number;
      }
    ).count,
  );
}

function currentHeadHash(raw: InstanceType<typeof Database>): string {
  return hashCanonicalJson(
    raw
      .prepare(
        `select entity_type, entity_id, field_key, resolution_id
         from field_resolution_heads
         order by entity_type, entity_id, field_key`,
      )
      .all(),
  );
}

export function persistEnrichmentRunSqlite(
  raw: InstanceType<typeof Database>,
  run: EnrichmentRunArtifact,
) {
  if (run.proposedResolutionHeads.length !== 0) {
    throw new Error(
      "Enrichment persistence refused: proposed current heads are not permitted",
    );
  }
  const rows = prepareEnrichmentPersistenceRows(run, "sqlite");
  const before = Object.fromEntries(
    (Object.keys(rows) as Array<keyof EnrichmentPersistenceRows>).map((key) => [
      key,
      rowCount(raw, key),
    ]),
  ) as Record<keyof EnrichmentPersistenceRows, number>;
  const headsBefore = currentHeadHash(raw);
  const db = drizzle(raw);
  const persist = raw.transaction(() => {
    if (rows.metadataSources.length) {
      db.insert(metadataSources)
        .values(rows.metadataSources as (typeof metadataSources.$inferInsert)[])
        .onConflictDoNothing()
        .run();
    }
    if (rows.sourceRecords.length) {
      db.insert(sourceRecords)
        .values(rows.sourceRecords as (typeof sourceRecords.$inferInsert)[])
        .onConflictDoNothing()
        .run();
    }
    if (rows.sourceRecordLinks.length) {
      db.insert(sourceRecordLinks)
        .values(
          rows.sourceRecordLinks as (typeof sourceRecordLinks.$inferInsert)[],
        )
        .onConflictDoNothing()
        .run();
    }
    if (rows.fieldObservations.length) {
      db.insert(fieldObservations)
        .values(
          rows.fieldObservations as (typeof fieldObservations.$inferInsert)[],
        )
        .onConflictDoNothing()
        .run();
    }
    for (const expected of rows.metadataSources) {
      const id = String(expected.id);
      const actual = db
        .select()
        .from(metadataSources)
        .where(eq(metadataSources.id, id))
        .get();
      assertEnrichmentPersistenceRow("metadataSources", expected, actual, id);
    }
    for (const expected of rows.sourceRecords) {
      const id = String(expected.id);
      const actual = db
        .select()
        .from(sourceRecords)
        .where(eq(sourceRecords.id, id))
        .get();
      assertEnrichmentPersistenceRow("sourceRecords", expected, actual, id);
    }
    for (const expected of rows.sourceRecordLinks) {
      const sourceRecordId = String(expected.sourceRecordId);
      const entityType = String(expected.entityType);
      const entityId = String(expected.entityId);
      const actual = db
        .select()
        .from(sourceRecordLinks)
        .where(
          and(
            eq(sourceRecordLinks.sourceRecordId, sourceRecordId),
            eq(sourceRecordLinks.entityType, entityType),
            eq(sourceRecordLinks.entityId, entityId),
          ),
        )
        .get();
      assertEnrichmentPersistenceRow(
        "sourceRecordLinks",
        expected,
        actual,
        `${sourceRecordId}:${entityType}:${entityId}`,
      );
    }
    for (const expected of rows.fieldObservations) {
      const id = String(expected.id);
      const actual = db
        .select()
        .from(fieldObservations)
        .where(eq(fieldObservations.id, id))
        .get();
      assertEnrichmentPersistenceRow("fieldObservations", expected, actual, id);
    }
  });
  persist.immediate();
  const after = Object.fromEntries(
    (Object.keys(rows) as Array<keyof EnrichmentPersistenceRows>).map((key) => [
      key,
      rowCount(raw, key),
    ]),
  ) as Record<keyof EnrichmentPersistenceRows, number>;
  const headsAfter = currentHeadHash(raw);
  if (headsAfter !== headsBefore) {
    throw new Error(
      "Enrichment persistence invariant failed: current resolution heads changed",
    );
  }
  return {
    created: Object.fromEntries(
      (Object.keys(rows) as Array<keyof EnrichmentPersistenceRows>).map(
        (key) => [key, after[key] - before[key]],
      ),
    ) as Record<keyof EnrichmentPersistenceRows, number>,
    reused: Object.fromEntries(
      (Object.keys(rows) as Array<keyof EnrichmentPersistenceRows>).map(
        (key) => [key, rows[key].length - (after[key] - before[key])],
      ),
    ) as Record<keyof EnrichmentPersistenceRows, number>,
    currentHeadHash: headsAfter,
  };
}

export function enrichmentSqliteSnapshot(
  raw: InstanceType<typeof Database>,
  run: EnrichmentRunArtifact,
) {
  const sourceIds = run.metadataSources.map((source) => String(source.id));
  const placeholders = sourceIds.map(() => "?").join(", ");
  const metadataRows =
    sourceIds.length === 0
      ? []
      : raw
          .prepare(
            `select * from metadata_sources where id in (${placeholders}) order by id`,
          )
          .all(...sourceIds);
  const sourceRows =
    sourceIds.length === 0
      ? []
      : raw
          .prepare(
            `select * from source_records where source_id in (${placeholders}) order by id`,
          )
          .all(...sourceIds);
  const sourceRecordIds = sourceRows.map((row) =>
    String((row as { id: string }).id),
  );
  const recordPlaceholders = sourceRecordIds.map(() => "?").join(", ");
  const linkRows =
    sourceRecordIds.length === 0
      ? []
      : raw
          .prepare(
            `select * from source_record_links
             where source_record_id in (${recordPlaceholders})
             order by source_record_id, entity_type, entity_id`,
          )
          .all(...sourceRecordIds);
  const observationRows =
    sourceRecordIds.length === 0
      ? []
      : raw
          .prepare(
            `select * from field_observations
             where source_record_id in (${recordPlaceholders})
             order by id`,
          )
          .all(...sourceRecordIds);
  const currentHeads = raw
    .prepare(
      `select entity_type, entity_id, field_key, resolution_id
       from field_resolution_heads
       order by entity_type, entity_id, field_key`,
    )
    .all();
  const snapshot = {
    metadataSources: metadataRows,
    sourceRecords: sourceRows,
    sourceRecordLinks: linkRows,
    fieldObservations: observationRows,
    currentHeads,
  };
  return {
    snapshot,
    hash: hashCanonicalJson(snapshot),
    canonical: canonicalJson(snapshot),
  };
}

export const ENRICHMENT_PERSISTENCE_TABLES = {
  metadataSources,
  sourceRecords,
  sourceRecordLinks,
  fieldObservations,
  fieldResolutionHeads,
} as const;
