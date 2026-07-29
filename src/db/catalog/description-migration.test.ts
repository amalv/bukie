import {
  cpSync,
  mkdtempSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import Database from "better-sqlite3";
import { drizzle } from "drizzle-orm/better-sqlite3";
import { migrate } from "drizzle-orm/better-sqlite3/migrator";
import { describe, expect, it } from "vitest";
import {
  licensedDescriptionFixture,
  seedDescriptionFixturesSqlite,
} from "./enrichment/descriptions/fixtures";
import {
  descriptionCandidateIdentity,
  descriptionObservationIdentity,
} from "./enrichment/descriptions/repository";
import { SAMPLE_BASELINE_IMPORT_RECORDS } from "./enrichment/fixtures";
import { canonicalJson, hashCanonicalJson } from "./identity";
import { buildCatalogImportGraph } from "./importer";
import { importCatalogGraphSqlite } from "./sqlite-rebuild";

describe("description provenance SQLite migration", () => {
  it("backfills old licensed candidates with exact-text transformation proof", () => {
    const directory = mkdtempSync(
      path.join(tmpdir(), "bukie-description-migration-"),
    );
    const sqlitePath = path.join(directory, "catalog.sqlite");
    const oldMigrations = path.join(directory, "old-migrations");
    const raw = new Database(sqlitePath);
    try {
      cpSync(path.resolve("drizzle"), oldMigrations, { recursive: true });
      rmSync(path.join(oldMigrations, "0007_milky_omega_red.sql"));
      rmSync(path.join(oldMigrations, "meta", "0007_snapshot.json"));
      const journalPath = path.join(oldMigrations, "meta", "_journal.json");
      const journal = JSON.parse(readFileSync(journalPath, "utf8")) as {
        entries: Array<{ idx: number }>;
      };
      journal.entries = journal.entries.filter((entry) => entry.idx < 7);
      writeFileSync(journalPath, JSON.stringify(journal, null, 2));

      migrate(drizzle(raw), { migrationsFolder: oldMigrations });
      importCatalogGraphSqlite(
        raw,
        buildCatalogImportGraph(SAMPLE_BASELINE_IMPORT_RECORDS),
      );
      seedDescriptionFixturesSqlite(raw);
      const candidate = licensedDescriptionFixture();
      const candidateId = descriptionCandidateIdentity(candidate);
      const observationId = descriptionObservationIdentity(candidateId);
      const textHash = hashCanonicalJson(candidate.text);
      raw
        .prepare(
          `insert into field_observations (
             id, source_record_id, entity_type, entity_id, field_key,
             value_json, comparison_hash, provenance_kind, source_path,
             source_modified_at, retrieved_at, mapping_confidence, state,
             actor_ref, reason, derivation_name, derivation_version,
             parent_ids_json
           ) values (
             ?, ?, 'work', ?, 'work.description', ?, ?, 'imported',
             'licensed.description', null, ?, 1, 'active', null, null,
             null, null, null
           )`,
        )
        .run(
          observationId,
          candidate.sourceRecordId,
          candidate.workId,
          canonicalJson(candidate.text),
          textHash,
          candidate.createdAt,
        );
      raw
        .prepare(
          `insert into description_candidates (
             id, work_id, observation_id, description_class, text_content,
             text_hash, source_revision, source_policy_version,
             description_policy_version, license_name, license_url,
             attribution_text, derivatives_permitted, editor_ref,
             editorial_reason, editorial_revision, model_id, model_version,
             prompt_version, generation_input_hash, generated_at,
             generation_duration_ms, input_tokens, output_tokens,
             cost_microusd, quality_score, ambiguous_identity,
             sensitive_content, created_at
           ) values (
             ?, ?, ?, 'licensed_verbatim', ?, ?, ?, ?, ?, ?, ?, ?, 0,
             null, null, null, null, null, null, null, null, null, null,
             null, null, 80, 0, 0, ?
           )`,
        )
        .run(
          candidateId,
          candidate.workId,
          observationId,
          candidate.text,
          textHash,
          candidate.sourceRevision,
          candidate.sourcePolicyVersion,
          candidate.descriptionPolicyVersion,
          candidate.license.name,
          candidate.license.url,
          candidate.license.attributionText,
          candidate.createdAt,
        );

      migrate(drizzle(raw), { migrationsFolder: path.resolve("drizzle") });

      expect(
        raw
          .prepare(
            `select
               licensed_source_text_hash as sourceTextHash,
               licensed_text_transformed as transformed
             from description_candidates where id = ?`,
          )
          .get(candidateId),
      ).toEqual({ sourceTextHash: textHash, transformed: 0 });
      expect(raw.pragma("foreign_key_check")).toEqual([]);
    } finally {
      raw.close();
      rmSync(directory, { recursive: true, force: true });
    }
  });
});
