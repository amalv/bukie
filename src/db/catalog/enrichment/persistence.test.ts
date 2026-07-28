import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { buildCatalogImportGraph } from "../importer";
import { openCatalogSqlite, rebuildCatalogSqlite } from "../sqlite-rebuild";
import {
  SAMPLE_BASELINE_IMPORT_RECORDS,
  SAMPLE_PROVIDER_RECORDS,
} from "./fixtures";
import {
  enrichmentSqliteSnapshot,
  persistEnrichmentRunSqlite,
  prepareEnrichmentPersistenceRows,
} from "./persistence";
import { ENRICHMENT_SAMPLE_MANIFEST } from "./sample-manifest";
import { buildEnrichmentRun } from "./workflow";

describe("enrichment persistence parity and idempotency", () => {
  let directory: string;
  let sqlitePath: string;
  const workIds = ENRICHMENT_SAMPLE_MANIFEST.works.map((work) => work.workId);
  const graph = buildCatalogImportGraph(SAMPLE_BASELINE_IMPORT_RECORDS);
  const run = buildEnrichmentRun({
    manifest: ENRICHMENT_SAMPLE_MANIFEST,
    requestedWorkIds: workIds,
    records: SAMPLE_PROVIDER_RECORDS,
  });

  beforeEach(() => {
    directory = mkdtempSync(path.join(tmpdir(), "bukie-enrichment-test-"));
    sqlitePath = path.join(directory, "catalog-enrichment-test.sqlite");
  });

  afterEach(() => {
    rmSync(directory, { recursive: true, force: true });
  });

  it("persists the same run twice without duplicates or current-head changes", () => {
    rebuildCatalogSqlite({ sqlitePath, graph });
    const { raw } = openCatalogSqlite(sqlitePath);
    try {
      const headsBefore = raw
        .prepare("select count(*) as count from field_resolution_heads")
        .get() as { count: number };
      const first = persistEnrichmentRunSqlite(raw, run);
      const firstSnapshot = enrichmentSqliteSnapshot(raw, run);
      const second = persistEnrichmentRunSqlite(raw, run);
      const secondSnapshot = enrichmentSqliteSnapshot(raw, run);
      const headsAfter = raw
        .prepare("select count(*) as count from field_resolution_heads")
        .get() as { count: number };

      expect(first.created).toEqual({
        metadataSources: 2,
        sourceRecords: 10,
        sourceRecordLinks: 10,
        fieldObservations: 9,
      });
      expect(second.created).toEqual({
        metadataSources: 0,
        sourceRecords: 0,
        sourceRecordLinks: 0,
        fieldObservations: 0,
      });
      expect(second.reused).toEqual({
        metadataSources: 2,
        sourceRecords: 10,
        sourceRecordLinks: 10,
        fieldObservations: 9,
      });
      expect(firstSnapshot.hash).toBe(secondSnapshot.hash);
      expect(first.currentHeadHash).toBe(second.currentHeadHash);
      expect(headsAfter.count).toBe(headsBefore.count);
    } finally {
      raw.close();
    }
  });

  it("serializes equivalent logical rows for SQLite and Postgres", () => {
    const sqlite = prepareEnrichmentPersistenceRows(run, "sqlite");
    const postgres = prepareEnrichmentPersistenceRows(run, "postgres");
    const normalizeSqlite = (rows: typeof sqlite) => ({
      ...rows,
      metadataSources: rows.metadataSources.map((row) => ({
        ...row,
        metadataPolicy:
          typeof row.metadataPolicy === "string"
            ? JSON.parse(row.metadataPolicy)
            : row.metadataPolicy,
        assetPolicy:
          typeof row.assetPolicy === "string"
            ? JSON.parse(row.assetPolicy)
            : row.assetPolicy,
      })),
      sourceRecords: rows.sourceRecords.map((row) => ({
        ...row,
        payloadJson:
          typeof row.payloadJson === "string"
            ? JSON.parse(row.payloadJson)
            : row.payloadJson,
      })),
      fieldObservations: rows.fieldObservations.map((row) => ({
        ...row,
        valueJson:
          typeof row.valueJson === "string"
            ? JSON.parse(row.valueJson)
            : row.valueJson,
        parentIdsJson:
          typeof row.parentIdsJson === "string"
            ? JSON.parse(row.parentIdsJson)
            : row.parentIdsJson,
      })),
    });
    expect(normalizeSqlite(sqlite)).toEqual(postgres);
  });

  it("fails closed and rolls back when a reused source revision changes", () => {
    rebuildCatalogSqlite({ sqlitePath, graph });
    const changedRecords = SAMPLE_PROVIDER_RECORDS.map((record, index) =>
      index === 0
        ? {
            ...record,
            evidence: record.evidence.map((evidence) => ({
              ...evidence,
              value: "Changed title under reused source revision",
            })),
          }
        : record,
    );
    const changedRun = buildEnrichmentRun({
      manifest: ENRICHMENT_SAMPLE_MANIFEST,
      requestedWorkIds: workIds,
      records: changedRecords,
    });
    const { raw } = openCatalogSqlite(sqlitePath);
    try {
      persistEnrichmentRunSqlite(raw, run);
      expect(() => persistEnrichmentRunSqlite(raw, changedRun)).toThrow(
        "immutable sourceRecords row",
      );
      const afterConflict = persistEnrichmentRunSqlite(raw, run);
      expect(afterConflict.created).toEqual({
        metadataSources: 0,
        sourceRecords: 0,
        sourceRecordLinks: 0,
        fieldObservations: 0,
      });
      expect(afterConflict.reused.fieldObservations).toBe(9);
    } finally {
      raw.close();
    }
  });
});
