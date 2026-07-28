import postgres from "postgres";
import { describe, expect, it } from "vitest";
import { hashCanonicalJson } from "./identity";
import { buildCatalogImportGraph } from "./importer";
import { rebuildCatalogPostgres } from "./postgres-rebuild";
import { resolveRebuildTarget } from "./rebuild-safety";
import { resolveWorkFirstPublicationPostgres } from "./work-first-publication";

const isolatedUrl = process.env.CATALOG_TEST_POSTGRES_URL;

describe.skipIf(!isolatedUrl)(
  "Postgres work first-publication resolution",
  () => {
    it("matches SQLite semantics, preserves edition dates, and rolls back atomically", async () => {
      const target = resolveRebuildTarget({
        rawTarget: `postgres:${isolatedUrl}`,
        confirmDisposable: true,
        env: { NODE_ENV: "test" },
      });
      if (target.driver !== "postgres") {
        throw new Error("Expected an isolated Postgres target");
      }
      const graph = buildCatalogImportGraph([
        {
          sourceKey: "legacy_catalog",
          recordKey: "postgres-work-date",
          title: "Postgres Independent Dates",
          authors: [{ name: "Example Author" }],
          categories: [],
          publicationDate: "2020-07",
        },
      ]);
      const workId = String(graph.works[0].id);
      const editionId = String(graph.editions[0].id);
      await rebuildCatalogPostgres({ url: target.url, graph });
      const client = postgres(target.url, { max: 1 });
      const addEvidence = async (
        key: string,
        value: { date: string; precision: "year" | "month" | "day" },
      ) => {
        const sourceId = `pg-source-${key}`;
        const recordId = `pg-record-${key}`;
        const observationId = `pg-observation-${key}`;
        await client`
          insert into metadata_sources (
            id, key, name, terms_url, attribution_url, reviewed_at,
            approval_state, metadata_policy, asset_policy, payload_policy,
            refresh_interval_ms
          ) values (
            ${sourceId}, ${`pg-${key}`}, ${`PG source ${key}`}, null, null,
            ${new Date(Date.UTC(2026, 6, 28))}, 'approved',
            ${client.json({
              display: true,
              fieldPermission: {
                allowedFields: ["work.first_publication_date"],
              },
              proposedEvidenceOnly: false,
            })},
            ${client.json({ display: false })}, 'selected_fields', null
          )
        `;
        await client`
          insert into source_records (
            id, source_id, record_key, source_revision, source_modified_at,
            retrieved_at, payload_json, payload_hash, importer_version,
            source_row_hash, state
          ) values (
            ${recordId}, ${sourceId}, ${key}, 'v1', null,
            ${new Date(Date.UTC(2026, 6, 28))}, null, null, 'test',
            ${hashCanonicalJson({ key })}, 'active'
          )
        `;
        await client`
          insert into source_record_links (
            source_record_id, entity_type, entity_id, match_kind,
            mapping_confidence, state, actor_ref, reason, created_at
          ) values (
            ${recordId}, 'work', ${workId}, 'source_relationship', 1,
            'active', null, null, ${new Date(Date.UTC(2026, 6, 28))}
          )
        `;
        await client`
          insert into field_observations (
            id, source_record_id, entity_type, entity_id, field_key,
            value_json, comparison_hash, provenance_kind, source_path,
            source_modified_at, retrieved_at, mapping_confidence, state,
            actor_ref, reason, derivation_name, derivation_version,
            parent_ids_json
          ) values (
            ${observationId}, ${recordId}, 'work', ${workId},
            'work.first_publication_date', ${client.json(value)},
            ${hashCanonicalJson(value)}, 'imported', 'publication', null,
            ${new Date(Date.UTC(2026, 6, 28))}, 1, 'active', null, null,
            null, null, null
          )
        `;
        return observationId;
      };
      try {
        await addEvidence("year", { date: "1965", precision: "year" });
        await addEvidence("day", { date: "1965-06-18", precision: "day" });
        const first = await resolveWorkFirstPublicationPostgres(target.url, {
          workId,
          resolvedAt: 200,
        });
        const retry = await resolveWorkFirstPublicationPostgres(target.url, {
          workId,
          resolvedAt: 300,
        });
        expect(first).toMatchObject({
          changed: true,
          decision: { state: "present" },
          projection: {
            firstPublicationDate: "1965-06-18",
            firstPublicationPrecision: "day",
            firstPublicationSortDate: "1965-06-18",
          },
        });
        expect(retry).toMatchObject({
          changed: false,
          resolutionId: first.resolutionId,
        });
        expect(
          await client`
            select first_publication_date as date,
                   first_publication_precision as precision,
                   first_publication_sort_date as "sortDate"
            from works where id = ${workId}
          `,
        ).toMatchObject([
          { date: "1965-06-18", precision: "day", sortDate: "1965-06-18" },
        ]);
        expect(
          await client`
            select publication_date as date, publication_precision as precision
            from editions where id = ${editionId}
          `,
        ).toMatchObject([{ date: "2020-07", precision: "month" }]);

        const conflictId = await addEvidence("conflict", {
          date: "1966",
          precision: "year",
        });
        const conflict = await resolveWorkFirstPublicationPostgres(target.url, {
          workId,
          resolvedAt: 400,
        });
        expect(conflict.decision.state).toBe("conflicting");
        expect(
          await client`
            select first_publication_date as date from works where id = ${workId}
          `,
        ).toMatchObject([{ date: null }]);

        await client`
          update field_observations set state = 'invalid'
          where id = ${conflictId}
        `;
        await expect(
          resolveWorkFirstPublicationPostgres(target.url, {
            workId,
            resolvedAt: 500,
            failAfter: "head",
          }),
        ).rejects.toThrow("Forced work first-publication failure after head");
        expect(
          await client`
            select h.resolution_id as id,
                   w.first_publication_date as date
            from works w
            join field_resolution_heads h
              on h.entity_type = 'work'
             and h.entity_id = w.id
             and h.field_key = 'work.first_publication_date'
            where w.id = ${workId}
          `,
        ).toMatchObject([{ id: conflict.resolutionId, date: null }]);
      } finally {
        await client.end({ timeout: 5_000 });
      }
    }, 120_000);
  },
);
