import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import type Database from "better-sqlite3";
import { describe, expect, it } from "vitest";
import { canonicalJson, hashCanonicalJson } from "./identity";
import { buildCatalogImportGraph } from "./importer";
import {
  type CatalogQueryExecutor,
  createCatalogRepository,
} from "./repository";
import { openCatalogSqlite, rebuildCatalogSqlite } from "./sqlite-rebuild";
import {
  resolveWorkFirstPublicationSqlite,
  WORK_FIRST_PUBLICATION_RESOLVER_VERSION,
} from "./work-first-publication";

type TestDatabase = {
  directory: string;
  raw: InstanceType<typeof Database>;
  workId: string;
  editionId: string;
};

function setup(): TestDatabase {
  const directory = mkdtempSync(path.join(tmpdir(), "bukie-work-date-"));
  const sqlitePath = path.join(directory, "catalog.sqlite");
  const graph = buildCatalogImportGraph([
    {
      sourceKey: "legacy_catalog",
      recordKey: "work-date-fixture",
      title: "Independent Dates",
      authors: [{ name: "Example Author" }],
      categories: [],
      publicationDate: "2020-07",
    },
  ]);
  rebuildCatalogSqlite({ sqlitePath, graph });
  const { raw } = openCatalogSqlite(sqlitePath);
  return {
    directory,
    raw,
    workId: String(graph.works[0].id),
    editionId: String(graph.editions[0].id),
  };
}

function cleanup(database: TestDatabase): void {
  database.raw.close();
  rmSync(database.directory, { recursive: true, force: true });
}

function addEvidence(
  database: TestDatabase,
  input: {
    key: string;
    value: unknown;
    observationState?: "active" | "stale" | "withdrawn" | "invalid";
    sourceApproval?: "approved" | "suspended";
    sourceRecordState?: "active" | "withdrawn" | "deleted";
    linkState?: "active" | "candidate" | "rejected";
    provenanceKind?: "curated" | "imported";
    proposedEvidenceOnly?: boolean;
    retrievedAt?: number;
  },
): string {
  const sourceId = `source-${input.key}`;
  const sourceRecordId = `record-${input.key}`;
  const observationId = `observation-${input.key}`;
  const provenanceKind = input.provenanceKind ?? "imported";
  const metadataPolicy = canonicalJson({
    display: true,
    fieldPermission: {
      allowedFields: ["work.first_publication_date"],
    },
    proposedEvidenceOnly: input.proposedEvidenceOnly ?? false,
  });
  database.raw
    .prepare(
      `insert into metadata_sources (
         id, key, name, terms_url, attribution_url, reviewed_at,
         approval_state, metadata_policy, asset_policy, payload_policy,
         refresh_interval_ms
       ) values (?, ?, ?, null, null, ?, ?, ?, ?, 'selected_fields', null)`,
    )
    .run(
      sourceId,
      input.key,
      `Source ${input.key}`,
      Date.UTC(2026, 6, 28),
      input.sourceApproval ?? "approved",
      metadataPolicy,
      canonicalJson({ display: false }),
    );
  database.raw
    .prepare(
      `insert into source_records (
         id, source_id, record_key, source_revision, source_modified_at,
         retrieved_at, payload_json, payload_hash, importer_version,
         source_row_hash, state
       ) values (?, ?, ?, 'v1', null, ?, null, null, 'test', ?, ?)`,
    )
    .run(
      sourceRecordId,
      sourceId,
      input.key,
      input.retrievedAt ?? 100,
      hashCanonicalJson({ key: input.key }),
      input.sourceRecordState ?? "active",
    );
  database.raw
    .prepare(
      `insert into source_record_links (
         source_record_id, entity_type, entity_id, match_kind,
         mapping_confidence, state, actor_ref, reason, created_at
       ) values (?, 'work', ?, ?, 1, ?, null, null, 100)`,
    )
    .run(
      sourceRecordId,
      database.workId,
      input.linkState === "candidate" ? "candidate" : "source_relationship",
      input.linkState ?? "active",
    );
  database.raw
    .prepare(
      `insert into field_observations (
         id, source_record_id, entity_type, entity_id, field_key, value_json,
         comparison_hash, provenance_kind, source_path, source_modified_at,
         retrieved_at, mapping_confidence, state, actor_ref, reason,
         derivation_name, derivation_version, parent_ids_json
       ) values (
         ?, ?, 'work', ?, 'work.first_publication_date', ?, ?, ?,
         'publication', null, ?, 1, ?, ?, ?, null, null, null
       )`,
    )
    .run(
      observationId,
      sourceRecordId,
      database.workId,
      canonicalJson(input.value),
      hashCanonicalJson(input.value),
      provenanceKind,
      input.retrievedAt ?? 100,
      input.observationState ?? "active",
      provenanceKind === "curated" ? "user:test-editor" : null,
      provenanceKind === "curated" ? "Verified from work evidence" : null,
    );
  return observationId;
}

async function repositoryFor(database: TestDatabase) {
  const executor: CatalogQueryExecutor = {
    dialect: "sqlite",
    async query<T extends Record<string, unknown>>(
      statement: string,
      parameters: unknown[] = [],
    ) {
      return database.raw.prepare(statement).all(...parameters) as T[];
    },
  };
  return createCatalogRepository(executor);
}

describe("provenance-resolved work first publication", () => {
  it.each([
    ["1965", "year", "1965-01-01"],
    ["1965-06", "month", "1965-06-01"],
    ["1965-06-18", "day", "1965-06-18"],
  ] as const)("round-trips %s precision without changing the edition date", async (date, precision, sortDate) => {
    const database = setup();
    try {
      addEvidence(database, {
        key: `precision-${precision}`,
        value: { date, precision },
      });
      const result = resolveWorkFirstPublicationSqlite(database.raw, {
        workId: database.workId,
        resolvedAt: 200,
      });
      expect(result).toMatchObject({
        changed: true,
        decision: { state: "present" },
        projection: {
          firstPublicationDate: date,
          firstPublicationPrecision: precision,
          firstPublicationSortDate: sortDate,
        },
      });
      const repository = await repositoryFor(database);
      const detail = await repository.getWorkDetail(database.workId);
      expect(detail?.firstPublication).toEqual({ date, precision });
      expect(detail?.preferredEdition?.publication).toEqual({
        date: "2020-07",
        precision: "month",
      });
    } finally {
      cleanup(database);
    }
  });

  it("selects compatible greater precision deterministically and is idempotent", () => {
    const database = setup();
    try {
      addEvidence(database, {
        key: "year",
        value: { date: "1965", precision: "year" },
      });
      const selected = addEvidence(database, {
        key: "day",
        value: { date: "1965-06-18", precision: "day" },
      });
      const first = resolveWorkFirstPublicationSqlite(database.raw, {
        workId: database.workId,
        resolvedAt: 200,
      });
      const second = resolveWorkFirstPublicationSqlite(database.raw, {
        workId: database.workId,
        resolvedAt: 300,
      });
      expect(first.decision.selectedObservationId).toBe(selected);
      expect(second).toMatchObject({
        changed: false,
        resolutionId: first.resolutionId,
      });
      expect(
        database.raw
          .prepare(
            `select count(*) as count from field_resolutions
             where entity_id = ? and field_key = 'work.first_publication_date'`,
          )
          .get(database.workId),
      ).toEqual({ count: 1 });
    } finally {
      cleanup(database);
    }
  });

  it("keeps incompatible years conflicting and out of projections", async () => {
    const database = setup();
    try {
      addEvidence(database, {
        key: "conflict-a",
        value: { date: "1965", precision: "year" },
      });
      addEvidence(database, {
        key: "conflict-b",
        value: { date: "1966", precision: "year" },
      });
      const result = resolveWorkFirstPublicationSqlite(database.raw, {
        workId: database.workId,
        resolvedAt: 200,
      });
      expect(result.decision).toMatchObject({
        state: "conflicting",
        selectedObservationId: null,
      });
      await expect(
        (await repositoryFor(database)).getWorkDetail(database.workId),
      ).resolves.toMatchObject({ firstPublication: undefined });
    } finally {
      cleanup(database);
    }
  });

  it.each([
    ["missing", undefined, undefined, "missing"],
    ["invalid", "invalid", undefined, "missing"],
    ["suspended", "active", "suspended", "missing"],
    ["stale", "stale", undefined, "stale"],
    ["withdrawn", "withdrawn", undefined, "withdrawn"],
  ] as const)("applies %s evidence eligibility", (key, observationState, sourceApproval, expectedState) => {
    const database = setup();
    try {
      if (observationState) {
        addEvidence(database, {
          key,
          value:
            observationState === "invalid"
              ? { date: "1965-13", precision: "month" }
              : { date: "1965", precision: "year" },
          observationState,
          sourceApproval,
        });
      }
      const result = resolveWorkFirstPublicationSqlite(database.raw, {
        workId: database.workId,
        resolvedAt: 200,
      });
      expect(result.decision.state).toBe(expectedState);
      expect(result.projection.firstPublicationDate).toBe(
        expectedState === "stale" ? "1965" : null,
      );
    } finally {
      cleanup(database);
    }
  });

  it("withdraws a prior projection and retains immutable resolution history", () => {
    const database = setup();
    try {
      const observationId = addEvidence(database, {
        key: "withdrawal",
        value: { date: "1965", precision: "year" },
      });
      const first = resolveWorkFirstPublicationSqlite(database.raw, {
        workId: database.workId,
        resolvedAt: 200,
      });
      database.raw
        .prepare(
          "update field_observations set state = 'withdrawn' where id = ?",
        )
        .run(observationId);
      const withdrawn = resolveWorkFirstPublicationSqlite(database.raw, {
        workId: database.workId,
        resolvedAt: 300,
      });
      expect(withdrawn.decision.state).toBe("withdrawn");
      expect(withdrawn.projection.firstPublicationDate).toBeNull();
      expect(
        database.raw
          .prepare(
            `select previous_resolution_id as previous
             from field_resolutions where id = ?`,
          )
          .get(withdrawn.resolutionId),
      ).toEqual({ previous: first.resolutionId });
    } finally {
      cleanup(database);
    }
  });

  it("excludes unpromoted proposed evidence from resolution", () => {
    const database = setup();
    try {
      addEvidence(database, {
        key: "proposed",
        value: { date: "1965", precision: "year" },
        proposedEvidenceOnly: true,
      });
      expect(
        resolveWorkFirstPublicationSqlite(database.raw, {
          workId: database.workId,
          resolvedAt: 200,
        }).decision.state,
      ).toBe("missing");
    } finally {
      cleanup(database);
    }
  });

  it("immediately hides a prior projection when field policy is revoked", async () => {
    const database = setup();
    try {
      addEvidence(database, {
        key: "policy-revocation",
        value: { date: "1965", precision: "year" },
      });
      resolveWorkFirstPublicationSqlite(database.raw, {
        workId: database.workId,
        resolvedAt: 200,
      });
      const repository = await repositoryFor(database);
      await expect(
        repository.getWorkDetail(database.workId),
      ).resolves.toMatchObject({
        firstPublication: { date: "1965", precision: "year" },
      });

      for (const metadataPolicy of [
        {
          display: true,
          fieldPermission: {
            allowedFields: ["work.first_publication_date"],
          },
          proposedEvidenceOnly: true,
        },
        {
          display: true,
          fieldPermission: { allowedFields: ["work.description"] },
          proposedEvidenceOnly: false,
        },
      ]) {
        database.raw
          .prepare(
            "update metadata_sources set metadata_policy = ? where key = 'policy-revocation'",
          )
          .run(canonicalJson(metadataPolicy));
        await expect(
          repository.getWorkDetail(database.workId),
        ).resolves.toMatchObject({ firstPublication: undefined });
      }

      expect(
        database.raw
          .prepare(
            `select count(*) as count from field_resolutions
             where entity_id = ? and field_key = 'work.first_publication_date'`,
          )
          .get(database.workId),
      ).toEqual({ count: 1 });
    } finally {
      cleanup(database);
    }
  });

  it("rolls back the resolution head and projection on a forced failure", () => {
    const database = setup();
    try {
      addEvidence(database, {
        key: "rollback",
        value: { date: "1965", precision: "year" },
      });
      expect(() =>
        resolveWorkFirstPublicationSqlite(database.raw, {
          workId: database.workId,
          resolvedAt: 200,
          failAfter: "head",
        }),
      ).toThrow("Forced work first-publication failure after head");
      expect(
        database.raw
          .prepare(
            `select count(*) as count from field_resolutions
             where entity_id = ? and field_key = 'work.first_publication_date'`,
          )
          .get(database.workId),
      ).toEqual({ count: 0 });
      expect(
        database.raw
          .prepare(
            `select first_publication_date as date from works where id = ?`,
          )
          .get(database.workId),
      ).toEqual({ date: null });
    } finally {
      cleanup(database);
    }
  });

  it("records the dedicated resolver version", () => {
    const database = setup();
    try {
      addEvidence(database, {
        key: "version",
        value: { date: "1965", precision: "year" },
      });
      const result = resolveWorkFirstPublicationSqlite(database.raw, {
        workId: database.workId,
        resolvedAt: 200,
      });
      expect(
        database.raw
          .prepare(
            `select resolver_version as version
             from field_resolutions where id = ?`,
          )
          .get(result.resolutionId),
      ).toEqual({ version: WORK_FIRST_PUBLICATION_RESOLVER_VERSION });
    } finally {
      cleanup(database);
    }
  });
});
