import type Database from "better-sqlite3";
import postgres from "postgres";
import {
  canonicalJson,
  deterministicCatalogId,
  hashCanonicalJson,
} from "../identity";
import { sourcePolicyAllowsFieldDisplay } from "../policy-eligibility";
import {
  APPROVED_PROMOTION_PROPOSALS,
  assertPromotionEvidenceEligibility,
  DIAGNOSTIC_FIVE_PROMOTION_VERSION,
  promotionEvidenceRows,
  verifyApprovedPromotionReport,
} from "./diagnostic-five-promotion";

type SqliteDatabase = InstanceType<typeof Database>;

export type DiagnosticFivePromotionInput = {
  reportBytes: Uint8Array;
  approvalId: string;
  proposalIds: readonly string[];
  actorRef: string;
  executionTarget: "disposable";
  promotedAt?: number;
  failAfter?: "evidence" | "resolution";
};

export type DiagnosticFivePromotionResult = {
  changed: boolean;
  resolutionIds: readonly string[];
  publicProjectionHash: string;
};

type CurrentResolution = {
  id: string;
  selectedObservationId: string | null;
  state: string;
  resolverVersion: string;
};

const FIELD_KEY = "work.first_publication_date";

const protectedSqliteHash = (raw: SqliteDatabase): string =>
  hashCanonicalJson({
    covers: raw
      .prepare(
        `select edition_id, cover_asset_id, position, is_primary
         from edition_covers order by edition_id, position, cover_asset_id`,
      )
      .all(),
    coverAssets: raw
      .prepare(
        `select id, object_key, state, checksum from cover_assets order by id`,
      )
      .all(),
    descriptions: raw
      .prepare(
        `select id, preferred_title, sort_title, description, preferred_edition_id
         from works order by id`,
      )
      .all(),
    otherHeads: raw
      .prepare(
        `select entity_type, entity_id, field_key, resolution_id
         from field_resolution_heads
         where field_key <> 'work.first_publication_date'
         order by entity_type, entity_id, field_key`,
      )
      .all(),
  });

const publicProjectionSqliteHash = (raw: SqliteDatabase): string =>
  hashCanonicalJson(
    raw
      .prepare(
        `select id, first_publication_date, first_publication_precision,
                first_publication_sort_date
         from works order by id`,
      )
      .all(),
  );

const assertExactSqliteRow = (
  raw: SqliteDatabase,
  statement: string,
  parameters: readonly unknown[],
  message: string,
): void => {
  const row = raw.prepare(statement).get(...parameters);
  if (!row) throw new Error(`Catalog promotion refused: ${message}`);
};

const currentResolutionSqlite = (
  raw: SqliteDatabase,
  workId: string,
): CurrentResolution | undefined =>
  raw
    .prepare(
      `select r.id,
              r.selected_observation_id as "selectedObservationId",
              r.state,
              r.resolver_version as "resolverVersion"
       from field_resolution_heads h
       join field_resolutions r on r.id = h.resolution_id
       where h.entity_type = 'work' and h.entity_id = ?
         and h.field_key = 'work.first_publication_date'`,
    )
    .get(workId) as CurrentResolution | undefined;

const ensureCurrentResolutionSqlite = (
  raw: SqliteDatabase,
  workId: string,
  createdAt: number,
): CurrentResolution => {
  const existing = currentResolutionSqlite(raw, workId);
  if (existing) return existing;
  const id = deterministicCatalogId(
    "field_resolution",
    `${DIAGNOSTIC_FIVE_PROMOTION_VERSION}:baseline`,
    workId,
  );
  raw
    .prepare(
      `insert into field_resolutions (
         id, entity_type, entity_id, field_key, selected_observation_id,
         state, reason, previous_resolution_id, actor_ref,
         resolver_version, resolved_at
       ) values (?, 'work', ?, ?, null, 'missing', ?, null, ?, ?, ?)`,
    )
    .run(
      id,
      workId,
      FIELD_KEY,
      "No eligible approved observation before issue #143 promotion",
      "system:catalog-promotion",
      `${DIAGNOSTIC_FIVE_PROMOTION_VERSION}:baseline`,
      createdAt,
    );
  raw
    .prepare(
      `insert into field_resolution_heads (
         entity_type, entity_id, field_key, resolution_id
       ) values ('work', ?, ?, ?)`,
    )
    .run(workId, FIELD_KEY, id);
  return {
    id,
    selectedObservationId: null,
    state: "missing",
    resolverVersion: `${DIAGNOSTIC_FIVE_PROMOTION_VERSION}:baseline`,
  };
};

const nextResolutionId = (
  previousResolutionId: string,
  proposalId: string,
  selectedObservationId: string,
): string =>
  deterministicCatalogId(
    "field_resolution",
    DIAGNOSTIC_FIVE_PROMOTION_VERSION,
    hashCanonicalJson({
      previousResolutionId,
      proposalId,
      selectedObservationId,
    }),
  );

const persistAndRevalidateSqlite = (
  raw: SqliteDatabase,
): ReturnType<typeof promotionEvidenceRows> => {
  const rows = promotionEvidenceRows();
  assertPromotionEvidenceEligibility(rows);
  raw
    .prepare(
      `insert into metadata_sources (
         id, key, name, terms_url, attribution_url, reviewed_at,
         approval_state, metadata_policy, asset_policy, payload_policy,
         refresh_interval_ms
       ) values (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
       on conflict(id) do nothing`,
    )
    .run(...Object.values(rows.metadataSource));
  for (const entry of rows.entries) {
    raw
      .prepare(
        `insert into source_records (
           id, source_id, record_key, source_revision, source_modified_at,
           retrieved_at, payload_json, payload_hash, importer_version,
           source_row_hash, state
         ) values (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
         on conflict(id) do nothing`,
      )
      .run(...Object.values(entry.sourceRecord));
    raw
      .prepare(
        `insert into source_record_links (
           source_record_id, entity_type, entity_id, match_kind,
           mapping_confidence, state, actor_ref, reason, created_at
         ) values (?, ?, ?, ?, ?, ?, ?, ?, ?)
         on conflict(source_record_id, entity_type, entity_id) do nothing`,
      )
      .run(...Object.values(entry.sourceRecordLink));
    raw
      .prepare(
        `insert into field_observations (
           id, source_record_id, entity_type, entity_id, field_key,
           value_json, comparison_hash, provenance_kind, source_path,
           source_modified_at, retrieved_at, mapping_confidence, state,
           actor_ref, reason, derivation_name, derivation_version,
           parent_ids_json
         ) values (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
         on conflict(id) do nothing`,
      )
      .run(...Object.values(entry.fieldObservation));
  }

  const source = raw
    .prepare(
      `select approval_state as "approvalState",
              metadata_policy as "metadataPolicy",
              asset_policy as "assetPolicy"
       from metadata_sources where id = ?`,
    )
    .get(rows.metadataSource.id) as
    | {
        approvalState: string;
        metadataPolicy: string;
        assetPolicy: string;
      }
    | undefined;
  if (
    source?.approvalState !== "approved" ||
    canonicalJson(JSON.parse(source.metadataPolicy)) !==
      canonicalJson(JSON.parse(rows.metadataSource.metadataPolicy)) ||
    canonicalJson(JSON.parse(source.assetPolicy)) !==
      canonicalJson(JSON.parse(rows.metadataSource.assetPolicy)) ||
    !sourcePolicyAllowsFieldDisplay(source.metadataPolicy, FIELD_KEY) ||
    sourcePolicyAllowsFieldDisplay(source.assetPolicy, "edition.covers")
  ) {
    throw new Error(
      "Catalog promotion refused: source policy or rights eligibility drifted",
    );
  }
  for (const entry of rows.entries) {
    assertExactSqliteRow(
      raw,
      `select 1
       from source_records sr
       join source_record_links sl on sl.source_record_id = sr.id
       join field_observations o on o.source_record_id = sr.id
       where sr.id = ? and sr.source_id = ? and sr.source_revision = ?
         and sr.payload_json = ? and sr.payload_hash = ?
         and sr.source_row_hash = ? and sr.state = 'active'
         and sl.entity_type = 'work' and sl.entity_id = ?
         and sl.match_kind = 'source_relationship'
         and sl.mapping_confidence = 1 and sl.state = 'active'
         and sl.actor_ref = ? and sl.reason = ?
         and o.id = ? and o.entity_id = ? and o.field_key = ?
         and o.value_json = ? and o.comparison_hash = ?
         and o.provenance_kind = ? and o.source_path = ?
         and o.mapping_confidence = 1
         and o.state = 'active'`,
      [
        entry.sourceRecord.id,
        entry.sourceRecord.sourceId,
        entry.sourceRecord.sourceRevision,
        entry.sourceRecord.payloadJson,
        entry.sourceRecord.payloadHash,
        entry.sourceRecord.sourceRowHash,
        entry.proposal.workId,
        entry.sourceRecordLink.actorRef,
        entry.sourceRecordLink.reason,
        entry.fieldObservation.id,
        entry.proposal.workId,
        FIELD_KEY,
        entry.fieldObservation.valueJson,
        entry.fieldObservation.comparisonHash,
        entry.fieldObservation.provenanceKind,
        entry.fieldObservation.sourcePath,
      ],
      `identity, withdrawal, quality, or observation eligibility drifted for ${entry.proposal.title}`,
    );
  }
  return rows;
};

export const promoteDiagnosticFiveSqlite = (
  raw: SqliteDatabase,
  input: DiagnosticFivePromotionInput,
): DiagnosticFivePromotionResult => {
  if (input.executionTarget !== "disposable") {
    throw new Error(
      "Catalog promotion refused: production database execution is not approved",
    );
  }
  verifyApprovedPromotionReport(input.reportBytes, input);
  if (!input.actorRef.trim()) {
    throw new Error("Catalog promotion refused: actor reference is required");
  }
  const protectedBefore = protectedSqliteHash(raw);
  const apply = raw.transaction(() => {
    // Approval and allow-list are deliberately checked again after the write
    // transaction begins so callers cannot swap mutable input between checks.
    verifyApprovedPromotionReport(input.reportBytes, input);
    const rows = persistAndRevalidateSqlite(raw);
    if (input.failAfter === "evidence") {
      throw new Error(
        "Forced diagnostic-five promotion failure after evidence",
      );
    }
    const resolutionIds: string[] = [];
    let changed = false;
    for (const entry of rows.entries) {
      const work = raw
        .prepare(
          `select preferred_title as title, description,
                  first_publication_date as "firstPublicationDate"
           from works where id = ?`,
        )
        .get(entry.proposal.workId) as
        | {
            title: string;
            description: string | null;
            firstPublicationDate: string | null;
          }
        | undefined;
      if (!work || work.title !== entry.proposal.title) {
        throw new Error(
          `Catalog promotion refused: work identity drifted for ${entry.proposal.title}`,
        );
      }
      const current = ensureCurrentResolutionSqlite(
        raw,
        entry.proposal.workId,
        input.promotedAt ?? Date.now(),
      );
      if (
        current.resolverVersion === DIAGNOSTIC_FIVE_PROMOTION_VERSION &&
        current.selectedObservationId === entry.fieldObservation.id &&
        current.state === "present"
      ) {
        if (work.firstPublicationDate !== entry.proposal.value.date) {
          throw new Error(
            `Catalog promotion refused: projection drifted for ${entry.proposal.title}`,
          );
        }
        resolutionIds.push(current.id);
        continue;
      }
      const resolutionId = nextResolutionId(
        current.id,
        entry.proposal.proposalId,
        entry.fieldObservation.id,
      );
      raw
        .prepare(
          `insert into field_resolutions (
             id, entity_type, entity_id, field_key, selected_observation_id,
             state, reason, previous_resolution_id, actor_ref,
             resolver_version, resolved_at
           ) values (?, 'work', ?, ?, ?, 'present', ?, ?, ?, ?, ?)`,
        )
        .run(
          resolutionId,
          entry.proposal.workId,
          FIELD_KEY,
          entry.fieldObservation.id,
          `Explicitly reviewed issue #143 proposal ${entry.proposal.proposalId}`,
          current.id,
          input.actorRef,
          DIAGNOSTIC_FIVE_PROMOTION_VERSION,
          input.promotedAt ?? Date.now(),
        );
      raw
        .prepare(
          `update field_resolution_heads set resolution_id = ?
           where entity_type = 'work' and entity_id = ? and field_key = ?`,
        )
        .run(resolutionId, entry.proposal.workId, FIELD_KEY);
      raw
        .prepare(
          `update works set first_publication_date = ?,
                            first_publication_precision = 'year',
                            first_publication_sort_date = ?,
                            updated_at = ?
           where id = ?`,
        )
        .run(
          entry.proposal.value.date,
          `${entry.proposal.value.date}-01-01`,
          input.promotedAt ?? Date.now(),
          entry.proposal.workId,
        );
      resolutionIds.push(resolutionId);
      changed = true;
    }
    if (input.failAfter === "resolution") {
      throw new Error(
        "Forced diagnostic-five promotion failure after resolution",
      );
    }
    if (protectedSqliteHash(raw) !== protectedBefore) {
      throw new Error(
        "Catalog promotion isolation failed: a non-approved public projection changed",
      );
    }
    return {
      changed,
      resolutionIds: resolutionIds.sort(),
      publicProjectionHash: publicProjectionSqliteHash(raw),
    };
  });
  return apply.immediate();
};

export const rollbackDiagnosticFiveSqlite = (
  raw: SqliteDatabase,
  input: {
    actorRef: string;
    reason: string;
    executionTarget: "disposable";
    rolledBackAt?: number;
    failAfter?: "resolution";
  },
): DiagnosticFivePromotionResult => {
  if (input.executionTarget !== "disposable") {
    throw new Error(
      "Catalog rollback refused: production database execution is not approved",
    );
  }
  if (!input.actorRef.trim() || !input.reason.trim()) {
    throw new Error("Catalog rollback refused: actor and reason are required");
  }
  const protectedBefore = protectedSqliteHash(raw);
  return raw
    .transaction(() => {
      const resolutionIds: string[] = [];
      let changed = false;
      for (const proposal of APPROVED_PROMOTION_PROPOSALS) {
        const current = currentResolutionSqlite(raw, proposal.workId);
        if (!current) {
          throw new Error(
            `Catalog rollback refused: current promotion head missing for ${proposal.title}`,
          );
        }
        if (
          current.resolverVersion ===
          `${DIAGNOSTIC_FIVE_PROMOTION_VERSION}:rollback`
        ) {
          resolutionIds.push(current.id);
          continue;
        }
        if (
          current.resolverVersion !== DIAGNOSTIC_FIVE_PROMOTION_VERSION ||
          !current.selectedObservationId
        ) {
          throw new Error(
            `Catalog rollback refused: current promotion head drifted for ${proposal.title}`,
          );
        }
        const prior = raw
          .prepare(
            `select p.id, p.state,
                    p.selected_observation_id as "selectedObservationId"
             from field_resolutions c
             join field_resolutions p on p.id = c.previous_resolution_id
             where c.id = ?`,
          )
          .get(current.id) as
          | { id: string; state: string; selectedObservationId: string | null }
          | undefined;
        if (
          !prior ||
          prior.selectedObservationId !== null ||
          prior.state !== "missing"
        ) {
          throw new Error(
            `Catalog rollback refused: retained prior head is not the reviewed missing state for ${proposal.title}`,
          );
        }
        const resolutionId = deterministicCatalogId(
          "field_resolution",
          `${DIAGNOSTIC_FIVE_PROMOTION_VERSION}:rollback`,
          hashCanonicalJson({
            currentResolutionId: current.id,
            priorResolutionId: prior.id,
            reason: input.reason,
          }),
        );
        raw
          .prepare(
            `insert into field_resolutions (
               id, entity_type, entity_id, field_key,
               selected_observation_id, state, reason,
               previous_resolution_id, actor_ref, resolver_version,
               resolved_at
             ) values (?, 'work', ?, ?, null, 'missing', ?, ?, ?, ?, ?)`,
          )
          .run(
            resolutionId,
            proposal.workId,
            FIELD_KEY,
            input.reason,
            current.id,
            input.actorRef,
            `${DIAGNOSTIC_FIVE_PROMOTION_VERSION}:rollback`,
            input.rolledBackAt ?? Date.now(),
          );
        raw
          .prepare(
            `update field_resolution_heads set resolution_id = ?
             where entity_type = 'work' and entity_id = ? and field_key = ?`,
          )
          .run(resolutionId, proposal.workId, FIELD_KEY);
        raw
          .prepare(
            `update works set first_publication_date = null,
                              first_publication_precision = null,
                              first_publication_sort_date = null,
                              updated_at = ?
             where id = ?`,
          )
          .run(input.rolledBackAt ?? Date.now(), proposal.workId);
        resolutionIds.push(resolutionId);
        changed = true;
      }
      if (input.failAfter === "resolution") {
        throw new Error(
          "Forced diagnostic-five rollback failure after resolution",
        );
      }
      if (protectedSqliteHash(raw) !== protectedBefore) {
        throw new Error(
          "Catalog rollback isolation failed: a non-approved public projection changed",
        );
      }
      return {
        changed,
        resolutionIds: resolutionIds.sort(),
        publicProjectionHash: publicProjectionSqliteHash(raw),
      };
    })
    .immediate();
};

const postgresProtectedHash = async (
  sql: postgres.TransactionSql,
): Promise<string> => {
  const [covers, coverAssets, descriptions, otherHeads] = await Promise.all([
    sql.unsafe(
      `select edition_id, cover_asset_id, position, is_primary
       from edition_covers order by edition_id, position, cover_asset_id`,
    ),
    sql.unsafe(
      `select id, object_key, state, checksum from cover_assets order by id`,
    ),
    sql.unsafe(
      `select id, preferred_title, sort_title, description, preferred_edition_id
       from works order by id`,
    ),
    sql.unsafe(
      `select entity_type, entity_id, field_key, resolution_id
       from field_resolution_heads
       where field_key <> 'work.first_publication_date'
       order by entity_type, entity_id, field_key`,
    ),
  ]);
  return hashCanonicalJson({
    covers: [...covers],
    coverAssets: [...coverAssets],
    descriptions: [...descriptions],
    otherHeads: [...otherHeads],
  });
};

const postgresProjectionHash = async (
  sql: postgres.TransactionSql,
): Promise<string> =>
  hashCanonicalJson([
    ...(await sql.unsafe(
      `select id, first_publication_date, first_publication_precision,
              first_publication_sort_date from works order by id`,
    )),
  ]);

export const promoteDiagnosticFivePostgres = async (
  url: string,
  input: DiagnosticFivePromotionInput,
): Promise<DiagnosticFivePromotionResult> => {
  if (input.executionTarget !== "disposable") {
    throw new Error(
      "Catalog promotion refused: production database execution is not approved",
    );
  }
  const databaseName = decodeURIComponent(new URL(url).pathname)
    .replace(/^\/+/u, "")
    .toLowerCase();
  if (
    !/(?:^|[-_])(test|testing|isolated|disposable|issue[-_]?143)(?:$|[-_])/u.test(
      databaseName,
    )
  ) {
    throw new Error(
      "Catalog promotion refused: production database execution is not approved",
    );
  }
  verifyApprovedPromotionReport(input.reportBytes, input);
  if (!input.actorRef.trim()) {
    throw new Error("Catalog promotion refused: actor reference is required");
  }
  const client = postgres(url, { max: 1 });
  try {
    return await client.begin(async (sql) => {
      verifyApprovedPromotionReport(input.reportBytes, input);
      const rows = promotionEvidenceRows();
      assertPromotionEvidenceEligibility(rows);
      const protectedBefore = await postgresProtectedHash(sql);
      await sql.unsafe(
        `insert into metadata_sources (
           id, key, name, terms_url, attribution_url, reviewed_at,
           approval_state, metadata_policy, asset_policy, payload_policy,
           refresh_interval_ms
         ) values ($1,$2,$3,$4,$5,to_timestamp($6 / 1000.0),$7,$8::jsonb,$9::jsonb,$10,$11)
         on conflict(id) do nothing`,
        Object.values(rows.metadataSource),
      );
      for (const entry of rows.entries) {
        await sql.unsafe(
          `insert into source_records (
             id, source_id, record_key, source_revision, source_modified_at,
             retrieved_at, payload_json, payload_hash, importer_version,
             source_row_hash, state
           ) values ($1,$2,$3,$4,null,to_timestamp($6 / 1000.0),$7::jsonb,$8,$9,$10,$11)
           on conflict(id) do nothing`,
          Object.values(entry.sourceRecord),
        );
        await sql.unsafe(
          `insert into source_record_links (
             source_record_id, entity_type, entity_id, match_kind,
             mapping_confidence, state, actor_ref, reason, created_at
           ) values ($1,$2,$3,$4,$5,$6,$7,$8,to_timestamp($9 / 1000.0))
           on conflict(source_record_id, entity_type, entity_id) do nothing`,
          Object.values(entry.sourceRecordLink),
        );
        const observation = Object.values(entry.fieldObservation);
        await sql.unsafe(
          `insert into field_observations (
             id, source_record_id, entity_type, entity_id, field_key,
             value_json, comparison_hash, provenance_kind, source_path,
             source_modified_at, retrieved_at, mapping_confidence, state,
             actor_ref, reason, derivation_name, derivation_version,
             parent_ids_json
           ) values (
             $1,$2,$3,$4,$5,$6::jsonb,$7,$8,$9,null,
             to_timestamp($11 / 1000.0),$12,$13,$14,$15,$16,$17,$18::jsonb
           ) on conflict(id) do nothing`,
          observation,
        );
      }
      const sourceRows = await sql.unsafe<
        Array<{
          approvalState: string;
          metadataPolicy: Record<string, unknown>;
          assetPolicy: Record<string, unknown>;
        }>
      >(
        `select approval_state as "approvalState",
                metadata_policy as "metadataPolicy",
                asset_policy as "assetPolicy"
         from metadata_sources where id = $1`,
        [rows.metadataSource.id],
      );
      const source = sourceRows[0];
      if (
        source?.approvalState !== "approved" ||
        canonicalJson(source.metadataPolicy) !==
          canonicalJson(JSON.parse(rows.metadataSource.metadataPolicy)) ||
        canonicalJson(source.assetPolicy) !==
          canonicalJson(JSON.parse(rows.metadataSource.assetPolicy)) ||
        !sourcePolicyAllowsFieldDisplay(source.metadataPolicy, FIELD_KEY) ||
        sourcePolicyAllowsFieldDisplay(source.assetPolicy, "edition.covers")
      ) {
        throw new Error(
          "Catalog promotion refused: source policy or rights eligibility drifted",
        );
      }
      for (const entry of rows.entries) {
        const eligible = await sql.unsafe<Array<{ eligible: number }>>(
          `select 1 as eligible
           from source_records sr
           join source_record_links sl on sl.source_record_id = sr.id
           join field_observations o on o.source_record_id = sr.id
           where sr.id = $1 and sr.source_id = $2
             and sr.source_revision = $3 and sr.payload_json = $4::jsonb
             and sr.payload_hash = $5 and sr.source_row_hash = $6
             and sr.state = 'active'
             and sl.entity_type = 'work' and sl.entity_id = $7
             and sl.match_kind = 'source_relationship'
             and sl.mapping_confidence = 1 and sl.state = 'active'
             and sl.actor_ref = $8 and sl.reason = $9
             and o.id = $10 and o.entity_id = $7 and o.field_key = $11
             and o.value_json = $12::jsonb and o.comparison_hash = $13
             and o.provenance_kind = $14 and o.source_path = $15
             and o.mapping_confidence = 1 and o.state = 'active'`,
          [
            entry.sourceRecord.id,
            entry.sourceRecord.sourceId,
            entry.sourceRecord.sourceRevision,
            entry.sourceRecord.payloadJson,
            entry.sourceRecord.payloadHash,
            entry.sourceRecord.sourceRowHash,
            entry.proposal.workId,
            entry.sourceRecordLink.actorRef,
            entry.sourceRecordLink.reason,
            entry.fieldObservation.id,
            FIELD_KEY,
            entry.fieldObservation.valueJson,
            entry.fieldObservation.comparisonHash,
            entry.fieldObservation.provenanceKind,
            entry.fieldObservation.sourcePath,
          ],
        );
        if (!eligible[0]) {
          throw new Error(
            `Catalog promotion refused: identity, withdrawal, quality, or observation eligibility drifted for ${entry.proposal.title}`,
          );
        }
      }
      if (input.failAfter === "evidence") {
        throw new Error(
          "Forced diagnostic-five promotion failure after evidence",
        );
      }
      const resolutionIds: string[] = [];
      let changed = false;
      for (const entry of rows.entries) {
        const workRows = await sql.unsafe<
          Array<{ title: string; firstPublicationDate: string | null }>
        >(
          `select preferred_title as title,
                  first_publication_date as "firstPublicationDate"
           from works where id = $1 for update`,
          [entry.proposal.workId],
        );
        if (workRows[0]?.title !== entry.proposal.title) {
          throw new Error(
            `Catalog promotion refused: work identity drifted for ${entry.proposal.title}`,
          );
        }
        const currentRows = await sql.unsafe<CurrentResolution[]>(
          `select r.id,
                  r.selected_observation_id as "selectedObservationId",
                  r.state, r.resolver_version as "resolverVersion"
           from field_resolution_heads h
           join field_resolutions r on r.id = h.resolution_id
           where h.entity_type = 'work' and h.entity_id = $1
             and h.field_key = $2 for update`,
          [entry.proposal.workId, FIELD_KEY],
        );
        let current = currentRows[0];
        if (!current) {
          const baselineId = deterministicCatalogId(
            "field_resolution",
            `${DIAGNOSTIC_FIVE_PROMOTION_VERSION}:baseline`,
            entry.proposal.workId,
          );
          await sql.unsafe(
            `insert into field_resolutions (
               id, entity_type, entity_id, field_key,
               selected_observation_id, state, reason,
               previous_resolution_id, actor_ref, resolver_version,
               resolved_at
             ) values (
               $1,'work',$2,$3,null,'missing',$4,null,$5,$6,
               to_timestamp($7 / 1000.0)
             )`,
            [
              baselineId,
              entry.proposal.workId,
              FIELD_KEY,
              "No eligible approved observation before issue #143 promotion",
              "system:catalog-promotion",
              `${DIAGNOSTIC_FIVE_PROMOTION_VERSION}:baseline`,
              input.promotedAt ?? Date.now(),
            ],
          );
          await sql.unsafe(
            `insert into field_resolution_heads (
               entity_type, entity_id, field_key, resolution_id
             ) values ('work',$1,$2,$3)`,
            [entry.proposal.workId, FIELD_KEY, baselineId],
          );
          current = {
            id: baselineId,
            selectedObservationId: null,
            state: "missing",
            resolverVersion: `${DIAGNOSTIC_FIVE_PROMOTION_VERSION}:baseline`,
          };
        }
        if (
          current.resolverVersion === DIAGNOSTIC_FIVE_PROMOTION_VERSION &&
          current.selectedObservationId === entry.fieldObservation.id &&
          current.state === "present"
        ) {
          if (workRows[0]?.firstPublicationDate !== entry.proposal.value.date) {
            throw new Error(
              `Catalog promotion refused: projection drifted for ${entry.proposal.title}`,
            );
          }
          resolutionIds.push(current.id);
          continue;
        }
        const resolutionId = nextResolutionId(
          current.id,
          entry.proposal.proposalId,
          entry.fieldObservation.id,
        );
        await sql.unsafe(
          `insert into field_resolutions (
             id, entity_type, entity_id, field_key, selected_observation_id,
             state, reason, previous_resolution_id, actor_ref,
             resolver_version, resolved_at
           ) values ($1,'work',$2,$3,$4,'present',$5,$6,$7,$8,to_timestamp($9 / 1000.0))`,
          [
            resolutionId,
            entry.proposal.workId,
            FIELD_KEY,
            entry.fieldObservation.id,
            `Explicitly reviewed issue #143 proposal ${entry.proposal.proposalId}`,
            current.id,
            input.actorRef,
            DIAGNOSTIC_FIVE_PROMOTION_VERSION,
            input.promotedAt ?? Date.now(),
          ],
        );
        await sql.unsafe(
          `update field_resolution_heads set resolution_id = $1
           where entity_type = 'work' and entity_id = $2 and field_key = $3`,
          [resolutionId, entry.proposal.workId, FIELD_KEY],
        );
        await sql.unsafe(
          `update works set first_publication_date = $1,
                            first_publication_precision = 'year',
                            first_publication_sort_date = $2,
                            updated_at = to_timestamp($3 / 1000.0)
           where id = $4`,
          [
            entry.proposal.value.date,
            `${entry.proposal.value.date}-01-01`,
            input.promotedAt ?? Date.now(),
            entry.proposal.workId,
          ],
        );
        resolutionIds.push(resolutionId);
        changed = true;
      }
      if (input.failAfter === "resolution") {
        throw new Error(
          "Forced diagnostic-five promotion failure after resolution",
        );
      }
      if ((await postgresProtectedHash(sql)) !== protectedBefore) {
        throw new Error(
          "Catalog promotion isolation failed: a non-approved public projection changed",
        );
      }
      return {
        changed,
        resolutionIds: resolutionIds.sort(),
        publicProjectionHash: await postgresProjectionHash(sql),
      };
    });
  } finally {
    await client.end({ timeout: 5_000 });
  }
};

export const rollbackDiagnosticFivePostgres = async (
  url: string,
  input: {
    actorRef: string;
    reason: string;
    executionTarget: "disposable";
    rolledBackAt?: number;
    failAfter?: "resolution";
  },
): Promise<DiagnosticFivePromotionResult> => {
  if (input.executionTarget !== "disposable") {
    throw new Error(
      "Catalog rollback refused: production database execution is not approved",
    );
  }
  const databaseName = decodeURIComponent(new URL(url).pathname)
    .replace(/^\/+/u, "")
    .toLowerCase();
  if (
    !/(?:^|[-_])(test|testing|isolated|disposable|issue[-_]?143)(?:$|[-_])/u.test(
      databaseName,
    )
  ) {
    throw new Error(
      "Catalog rollback refused: production database execution is not approved",
    );
  }
  if (!input.actorRef.trim() || !input.reason.trim()) {
    throw new Error("Catalog rollback refused: actor and reason are required");
  }
  const client = postgres(url, { max: 1 });
  try {
    return await client.begin(async (sql) => {
      const protectedBefore = await postgresProtectedHash(sql);
      const resolutionIds: string[] = [];
      let changed = false;
      for (const proposal of APPROVED_PROMOTION_PROPOSALS) {
        const currentRows = await sql.unsafe<CurrentResolution[]>(
          `select r.id,
                  r.selected_observation_id as "selectedObservationId",
                  r.state, r.resolver_version as "resolverVersion"
           from field_resolution_heads h
           join field_resolutions r on r.id = h.resolution_id
           where h.entity_type = 'work' and h.entity_id = $1
             and h.field_key = $2 for update`,
          [proposal.workId, FIELD_KEY],
        );
        const current = currentRows[0];
        if (
          current?.resolverVersion ===
          `${DIAGNOSTIC_FIVE_PROMOTION_VERSION}:rollback`
        ) {
          resolutionIds.push(current.id);
          continue;
        }
        if (
          current?.resolverVersion !== DIAGNOSTIC_FIVE_PROMOTION_VERSION ||
          !current.selectedObservationId
        ) {
          throw new Error(
            `Catalog rollback refused: current promotion head drifted for ${proposal.title}`,
          );
        }
        const priorRows = await sql.unsafe<
          Array<{
            id: string;
            state: string;
            selectedObservationId: string | null;
          }>
        >(
          `select p.id, p.state,
                  p.selected_observation_id as "selectedObservationId"
           from field_resolutions c
           join field_resolutions p on p.id = c.previous_resolution_id
           where c.id = $1`,
          [current.id],
        );
        const prior = priorRows[0];
        if (
          !prior ||
          prior.state !== "missing" ||
          prior.selectedObservationId !== null
        ) {
          throw new Error(
            `Catalog rollback refused: retained prior head is not the reviewed missing state for ${proposal.title}`,
          );
        }
        const resolutionId = deterministicCatalogId(
          "field_resolution",
          `${DIAGNOSTIC_FIVE_PROMOTION_VERSION}:rollback`,
          hashCanonicalJson({
            currentResolutionId: current.id,
            priorResolutionId: prior.id,
            reason: input.reason,
          }),
        );
        await sql.unsafe(
          `insert into field_resolutions (
             id, entity_type, entity_id, field_key,
             selected_observation_id, state, reason,
             previous_resolution_id, actor_ref, resolver_version,
             resolved_at
           ) values (
             $1,'work',$2,$3,null,'missing',$4,$5,$6,$7,
             to_timestamp($8 / 1000.0)
           )`,
          [
            resolutionId,
            proposal.workId,
            FIELD_KEY,
            input.reason,
            current.id,
            input.actorRef,
            `${DIAGNOSTIC_FIVE_PROMOTION_VERSION}:rollback`,
            input.rolledBackAt ?? Date.now(),
          ],
        );
        await sql.unsafe(
          `update field_resolution_heads set resolution_id = $1
           where entity_type = 'work' and entity_id = $2 and field_key = $3`,
          [resolutionId, proposal.workId, FIELD_KEY],
        );
        await sql.unsafe(
          `update works set first_publication_date = null,
                            first_publication_precision = null,
                            first_publication_sort_date = null,
                            updated_at = to_timestamp($1 / 1000.0)
           where id = $2`,
          [input.rolledBackAt ?? Date.now(), proposal.workId],
        );
        resolutionIds.push(resolutionId);
        changed = true;
      }
      if (input.failAfter === "resolution") {
        throw new Error(
          "Forced diagnostic-five rollback failure after resolution",
        );
      }
      if ((await postgresProtectedHash(sql)) !== protectedBefore) {
        throw new Error(
          "Catalog rollback isolation failed: a non-approved public projection changed",
        );
      }
      return {
        changed,
        resolutionIds: resolutionIds.sort(),
        publicProjectionHash: await postgresProjectionHash(sql),
      };
    });
  } finally {
    await client.end({ timeout: 5_000 });
  }
};
