import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import { hashCanonicalJson } from "../identity";
import {
  fieldObservationsPg,
  metadataSourcesPg,
  sourceRecordLinksPg,
  sourceRecordsPg,
} from "../schema.pg";
import { prepareEnrichmentPersistenceRows } from "./persistence";
import type { EnrichmentRunArtifact } from "./types";

const TABLE_NAMES = {
  metadataSources: "metadata_sources",
  sourceRecords: "source_records",
  sourceRecordLinks: "source_record_links",
  fieldObservations: "field_observations",
} as const;

type PersistenceTable = keyof typeof TABLE_NAMES;

export async function persistEnrichmentRunPostgres(input: {
  url: string;
  run: EnrichmentRunArtifact;
}) {
  if (input.run.proposedResolutionHeads.length !== 0) {
    throw new Error(
      "Enrichment persistence refused: proposed current heads are not permitted",
    );
  }
  const rows = prepareEnrichmentPersistenceRows(input.run, "postgres");
  const client = postgres(input.url, { max: 1 });
  const db = drizzle(client);
  const countRows = async (table: PersistenceTable) => {
    const result = await client.unsafe(
      `select count(*)::int as count from "${TABLE_NAMES[table]}"`,
    );
    return Number(result[0]?.count ?? 0);
  };
  const currentHeadHash = async () =>
    hashCanonicalJson(
      await client.unsafe(
        `select entity_type, entity_id, field_key, resolution_id
         from field_resolution_heads
         order by entity_type, entity_id, field_key`,
      ),
    );

  try {
    const before = Object.fromEntries(
      await Promise.all(
        (Object.keys(TABLE_NAMES) as PersistenceTable[]).map(async (key) => [
          key,
          await countRows(key),
        ]),
      ),
    ) as Record<PersistenceTable, number>;
    const headsBefore = await currentHeadHash();
    await db.transaction(async (tx) => {
      if (rows.metadataSources.length) {
        await tx
          .insert(metadataSourcesPg)
          .values(
            rows.metadataSources as (typeof metadataSourcesPg.$inferInsert)[],
          )
          .onConflictDoNothing();
      }
      if (rows.sourceRecords.length) {
        await tx
          .insert(sourceRecordsPg)
          .values(rows.sourceRecords as (typeof sourceRecordsPg.$inferInsert)[])
          .onConflictDoNothing();
      }
      if (rows.sourceRecordLinks.length) {
        await tx
          .insert(sourceRecordLinksPg)
          .values(
            rows.sourceRecordLinks as (typeof sourceRecordLinksPg.$inferInsert)[],
          )
          .onConflictDoNothing();
      }
      if (rows.fieldObservations.length) {
        await tx
          .insert(fieldObservationsPg)
          .values(
            rows.fieldObservations as (typeof fieldObservationsPg.$inferInsert)[],
          )
          .onConflictDoNothing();
      }
    });
    const after = Object.fromEntries(
      await Promise.all(
        (Object.keys(TABLE_NAMES) as PersistenceTable[]).map(async (key) => [
          key,
          await countRows(key),
        ]),
      ),
    ) as Record<PersistenceTable, number>;
    const headsAfter = await currentHeadHash();
    if (headsAfter !== headsBefore) {
      throw new Error(
        "Enrichment persistence invariant failed: current resolution heads changed",
      );
    }
    return {
      created: Object.fromEntries(
        (Object.keys(rows) as PersistenceTable[]).map((key) => [
          key,
          after[key] - before[key],
        ]),
      ) as Record<PersistenceTable, number>,
      reused: Object.fromEntries(
        (Object.keys(rows) as PersistenceTable[]).map((key) => [
          key,
          rows[key].length - (after[key] - before[key]),
        ]),
      ) as Record<PersistenceTable, number>,
      currentHeadHash: headsAfter,
    };
  } finally {
    await client.end({ timeout: 5_000 });
  }
}
