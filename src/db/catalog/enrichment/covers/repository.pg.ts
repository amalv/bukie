import postgres from "postgres";
import { PLACEHOLDER_COVER } from "../../../../media/covers";
import {
  canonicalJson,
  deterministicCatalogId,
  hashCanonicalJson,
} from "../../identity";
import { coverCandidateIdentity, coverInspectionIdentity } from "./repository";
import type {
  CoverCandidateInput,
  CoverCandidateResult,
  CoverFlagCode,
  CoverGateCode,
  CoverInspection,
  CoverSelection,
} from "./types";
import { COVER_POLICY_VERSION } from "./types";
import {
  type CoverSourceContext,
  coverPolicyRequiresPurge,
  validateCoverCandidate,
} from "./validation";

type PgSql = postgres.Sql | postgres.TransactionSql;

type CandidateRow = {
  id: string;
  workId: string;
  editionId: string | null;
  sourceRecordId: string;
  representationType: "selected_edition" | "work_representative";
  identityMatchKind: CoverCandidateInput["identityMatchKind"];
  identityEvidence: Record<string, unknown>;
  permissionState: CoverCandidateInput["permissionState"];
  rightsBasis: string | null;
  attributionText: string | null;
  attributionUrl: string | null;
  sourceUrl: string;
  sourceRevision: string;
  sourcePolicyVersion: string;
  objectKey: string;
  transformationHistory: CoverCandidateInput["transformationHistory"];
  createdAt: number;
};

type InspectionRow = {
  id: string;
  candidateId: string;
  mediaType: string | null;
  byteSize: number;
  width: number | null;
  height: number | null;
  aspectRatio: number | null;
  checksum: string;
  decodeResult: CoverInspection["decodeResult"];
  flags: CoverFlagCode[];
  qualityScore: number;
  inspectionVersion: string;
  inspectedAt: number;
};

type DecisionRow = {
  id: string;
  inspectionId: string;
  state: CoverCandidateResult["state"];
  gateCodes: CoverGateCode[];
  warningCodes: CoverFlagCode[];
  purgeState: "not_required" | "pending" | "completed" | "failed";
};

type ProjectionRow = {
  id: string;
  candidateId: string | null;
  state: CoverSelection["state"];
};

const rows = <T>(value: unknown): T[] => value as T[];
const uniqueSorted = <T extends string>(values: readonly T[]): T[] =>
  [...new Set(values)].sort();
const jsonValue = <T>(value: unknown): T =>
  (typeof value === "string" ? JSON.parse(value) : value) as T;

const loadCandidate = async (
  sql: PgSql,
  candidateId: string,
): Promise<CandidateRow | undefined> => {
  const row = rows<CandidateRow>(
    await sql.unsafe(
      `select
         id, work_id as "workId", edition_id as "editionId",
         source_record_id as "sourceRecordId",
         representation_type as "representationType",
         identity_match_kind as "identityMatchKind",
         identity_evidence_json as "identityEvidence",
         permission_state as "permissionState", rights_basis as "rightsBasis",
         attribution_text as "attributionText",
         attribution_url as "attributionUrl", source_url as "sourceUrl",
         source_revision as "sourceRevision",
         source_policy_version as "sourcePolicyVersion",
         object_key as "objectKey",
         transformation_history_json as "transformationHistory",
         created_at as "createdAt"
       from cover_candidates where id = $1`,
      [candidateId],
    ),
  )[0];
  return row
    ? {
        ...row,
        identityEvidence: jsonValue(row.identityEvidence),
        transformationHistory: jsonValue(row.transformationHistory),
      }
    : undefined;
};

const loadDecision = async (
  sql: PgSql,
  candidateId: string,
): Promise<DecisionRow | undefined> => {
  const row = rows<DecisionRow>(
    await sql.unsafe(
      `select
         d.id, d.inspection_id as "inspectionId", d.state,
         d.gate_codes_json as "gateCodes",
         d.warning_codes_json as "warningCodes",
         d.purge_state as "purgeState"
       from cover_decision_heads h
       join cover_decisions d on d.id = h.decision_id
       where h.candidate_id = $1`,
      [candidateId],
    ),
  )[0];
  return row
    ? {
        ...row,
        gateCodes: jsonValue(row.gateCodes),
        warningCodes: jsonValue(row.warningCodes),
      }
    : undefined;
};

const loadInspection = async (
  sql: PgSql,
  inspectionId: string,
): Promise<InspectionRow> => {
  const row = rows<InspectionRow>(
    await sql.unsafe(
      `select
         id, candidate_id as "candidateId", media_type as "mediaType",
         byte_size as "byteSize", width, height, aspect_ratio as "aspectRatio",
         checksum, decode_result as "decodeResult", flags_json as flags,
         quality_score as "qualityScore",
         inspection_version as "inspectionVersion",
         inspected_at as "inspectedAt"
       from cover_inspections where id = $1`,
      [inspectionId],
    ),
  )[0];
  return { ...row, flags: jsonValue(row.flags) };
};

const candidateInput = (row: CandidateRow): CoverCandidateInput => ({
  workId: row.workId,
  editionId: row.editionId,
  sourceRecordId: row.sourceRecordId,
  representationType: row.representationType,
  identityMatchKind: row.identityMatchKind,
  identityEvidence: row.identityEvidence,
  permissionState: row.permissionState,
  rightsBasis: row.rightsBasis,
  attributionText: row.attributionText,
  attributionUrl: row.attributionUrl,
  sourceUrl: row.sourceUrl,
  sourceRevision: row.sourceRevision,
  sourcePolicyVersion: row.sourcePolicyVersion,
  objectKey: row.objectKey,
  transformationHistory: row.transformationHistory,
  createdAt: row.createdAt,
});

const inspectionInput = (row: InspectionRow): CoverInspection => ({
  mediaType: row.mediaType,
  byteSize: row.byteSize,
  width: row.width,
  height: row.height,
  aspectRatio: row.aspectRatio,
  checksum: row.checksum,
  decodeResult: row.decodeResult,
  flags: row.flags,
  qualityScore: row.qualityScore,
  inspectionVersion: row.inspectionVersion,
  inspectedAt: row.inspectedAt,
});

const sourceContext = async (
  sql: PgSql,
  candidate: CoverCandidateInput,
): Promise<CoverSourceContext | undefined> => {
  const targetType =
    candidate.representationType === "selected_edition" ? "edition" : "work";
  const targetId = candidate.editionId ?? candidate.workId;
  return rows<CoverSourceContext>(
    await sql.unsafe(
      `select
         sr.source_revision as "sourceRevision",
         sr.state as "sourceRecordState",
         s.approval_state as "sourceApproval",
         sl.state as "sourceLinkState",
         sl.match_kind as "sourceLinkMatchKind",
         s.metadata_policy as "metadataPolicy",
         s.asset_policy as "assetPolicy"
       from source_records sr
       join metadata_sources s on s.id = sr.source_id
       left join source_record_links sl
         on sl.source_record_id = sr.id
        and sl.entity_type = $1
        and sl.entity_id = $2
       where sr.id = $3`,
      [targetType, targetId, candidate.sourceRecordId],
    ),
  )[0];
};

const currentValidation = async (
  sql: PgSql,
  candidate: CoverCandidateInput,
  inspection: CoverInspection,
) => {
  const editionRows =
    candidate.editionId === null
      ? [{ present: 1 }]
      : rows<{ present: number }>(
          await sql.unsafe(
            `select 1 as present from editions
             where id = $1 and work_id = $2`,
            [candidate.editionId, candidate.workId],
          ),
        );
  const source = await sourceContext(sql, candidate);
  let identityVerified = false;
  if (candidate.identityMatchKind === "exact_isbn" && candidate.editionId) {
    for (const scheme of ["isbn10", "isbn13"]) {
      const value = candidate.identityEvidence[scheme];
      if (
        typeof value === "string" &&
        rows(
          await sql.unsafe(
            `select 1 from edition_identifiers
             where edition_id = $1 and scheme = $2 and value_normalized = $3`,
            [candidate.editionId, scheme, value],
          ),
        ).length > 0
      ) {
        identityVerified = true;
      }
    }
  } else if (
    candidate.identityMatchKind === "provider_edition_relation" ||
    candidate.identityMatchKind === "provider_work_relation"
  ) {
    identityVerified = source?.sourceLinkMatchKind === "source_relationship";
  } else if (candidate.identityMatchKind === "approved_strong_edition_tuple") {
    identityVerified =
      candidate.identityEvidence.policyApproved === true &&
      source?.sourceLinkMatchKind === "curated";
  } else if (candidate.identityMatchKind === "curated_work_relation") {
    identityVerified = source?.sourceLinkMatchKind === "curated";
  }
  return validateCoverCandidate({
    candidate,
    inspection,
    source,
    editionBelongsToWork: editionRows.length > 0,
    identityEvidenceVerified: identityVerified,
  });
};

const appendDecision = async (
  sql: PgSql,
  input: {
    candidateId: string;
    inspectionId: string;
    state: CoverCandidateResult["state"];
    gateCodes: readonly CoverGateCode[];
    warningCodes: readonly CoverFlagCode[];
    reviewerRef?: string | null;
    reason?: string | null;
    purgeState?: DecisionRow["purgeState"];
    decidedAt: number;
  },
): Promise<{ id: string; changed: boolean }> => {
  const previous = await loadDecision(sql, input.candidateId);
  const gateCodes = uniqueSorted(input.gateCodes);
  const warningCodes = uniqueSorted(input.warningCodes);
  const purgeState = input.purgeState ?? "not_required";
  if (
    previous &&
    previous.inspectionId === input.inspectionId &&
    previous.state === input.state &&
    canonicalJson(previous.gateCodes) === canonicalJson(gateCodes) &&
    canonicalJson(previous.warningCodes) === canonicalJson(warningCodes) &&
    previous.purgeState === purgeState
  ) {
    return { id: previous.id, changed: false };
  }
  const id = deterministicCatalogId(
    "cover_decision",
    input.candidateId,
    hashCanonicalJson({
      inspectionId: input.inspectionId,
      state: input.state,
      gateCodes,
      warningCodes,
      reviewerRef: input.reviewerRef ?? null,
      reason: input.reason ?? null,
      previousDecisionId: previous?.id ?? null,
      policyVersion: COVER_POLICY_VERSION,
      decidedAt: input.decidedAt,
    }),
  );
  await sql.unsafe(
    `insert into cover_decisions (
       id, candidate_id, inspection_id, state, gate_codes_json,
       warning_codes_json, reviewer_ref, review_reason, purge_state,
       previous_decision_id, policy_version, decided_at
     ) values ($1, $2, $3, $4, $5::jsonb, $6::jsonb, $7, $8, $9, $10, $11, $12)`,
    [
      id,
      input.candidateId,
      input.inspectionId,
      input.state,
      gateCodes,
      warningCodes,
      input.reviewerRef ?? null,
      input.reason ?? null,
      purgeState,
      previous?.id ?? null,
      COVER_POLICY_VERSION,
      input.decidedAt,
    ],
  );
  await sql.unsafe(
    `insert into cover_decision_heads (candidate_id, decision_id)
     values ($1, $2)
     on conflict(candidate_id) do update set decision_id = excluded.decision_id`,
    [input.candidateId, id],
  );
  return { id, changed: true };
};

const decisionStateForValidation = (validation: {
  hardRejected: boolean;
  gateCodes: readonly CoverGateCode[];
  warningCodes: readonly CoverFlagCode[];
}): CoverCandidateResult["state"] =>
  validation.hardRejected
    ? "rejected"
    : validation.gateCodes.length > 0 || validation.warningCodes.length > 0
      ? "review_required"
      : "eligible";

const normalizeDuplicateGroup = async (
  sql: PgSql,
  input: {
    candidateId: string;
    checksum: string;
    decidedAt: number;
    inspectionId: string;
  },
): Promise<{ inspection: CoverInspection; affectedWorkIds: string[] }> => {
  const group = rows<InspectionRow & { workId: string }>(
    await sql.unsafe(
      `select
         i.id, i.candidate_id as "candidateId", i.media_type as "mediaType",
         i.byte_size as "byteSize", i.width, i.height,
         i.aspect_ratio as "aspectRatio", i.checksum,
         i.decode_result as "decodeResult", i.flags_json as flags,
         i.quality_score as "qualityScore",
         i.inspection_version as "inspectionVersion",
         i.inspected_at as "inspectedAt", c.work_id as "workId"
       from cover_inspections i
       join cover_candidates c on c.id = i.candidate_id
       left join cover_decision_heads h on h.candidate_id = i.candidate_id
       left join cover_decisions d on d.id = h.decision_id
       where i.checksum = $1
         and (
           (i.candidate_id = $2 and i.id = $3)
           or (i.candidate_id <> $2 and d.inspection_id = i.id)
         )
       order by i.candidate_id asc, i.id asc`,
      [input.checksum, input.candidateId, input.inspectionId],
    ),
  ).map((row) => ({
    ...row,
    flags: jsonValue<CoverFlagCode[]>(row.flags),
  }));
  const canonicalCandidateId = group[0]?.candidateId;
  const affectedWorkIds = new Set<string>();

  for (const row of group) {
    const baseFlags = row.flags.filter((flag) => flag !== "duplicate");
    const isDuplicate = row.candidateId !== canonicalCandidateId;
    const flags = uniqueSorted([
      ...baseFlags,
      ...(isDuplicate ? (["duplicate"] as const) : []),
    ]);
    await sql.unsafe(
      `update cover_inspections
       set flags_json = $1::jsonb, duplicate_of_candidate_id = $2
       where id = $3`,
      [flags, isDuplicate ? canonicalCandidateId : null, row.id],
    );

    if (row.candidateId === input.candidateId) continue;
    const previous = await loadDecision(sql, row.candidateId);
    const candidate = await loadCandidate(sql, row.candidateId);
    if (
      !previous ||
      !candidate ||
      !["eligible", "review_required"].includes(previous.state)
    ) {
      continue;
    }
    const inspection = inspectionInput({ ...row, flags });
    const validation = await currentValidation(
      sql,
      candidateInput(candidate),
      inspection,
    );
    await appendDecision(sql, {
      candidateId: row.candidateId,
      inspectionId: row.id,
      state: decisionStateForValidation(validation),
      gateCodes: validation.gateCodes,
      warningCodes: validation.warningCodes,
      decidedAt: input.decidedAt,
    });
    affectedWorkIds.add(row.workId);
  }

  const current = group.find((row) => row.id === input.inspectionId);
  if (!current) throw new Error("Cover inspection not found after insert");
  return {
    inspection: inspectionInput({
      ...current,
      flags: uniqueSorted([
        ...current.flags.filter((flag) => flag !== "duplicate"),
        ...(current.candidateId !== canonicalCandidateId
          ? (["duplicate"] as const)
          : []),
      ]),
    }),
    affectedWorkIds: [...affectedWorkIds],
  };
};

const identityPriority = (
  kind: CoverCandidateInput["identityMatchKind"],
): number =>
  ({
    exact_isbn: 7,
    provider_edition_relation: 6,
    approved_strong_edition_tuple: 5,
    curated_work_relation: 4,
    provider_work_relation: 3,
    title_creator_candidate: 1,
    conflicting: 0,
  })[kind];

const eligibleCandidates = async (
  sql: PgSql,
  workId: string,
): Promise<Array<{ candidate: CandidateRow; inspection: InspectionRow }>> => {
  const candidates = rows<CandidateRow & { inspectionId: string }>(
    await sql.unsafe(
      `select
         c.id, c.work_id as "workId", c.edition_id as "editionId",
         c.source_record_id as "sourceRecordId",
         c.representation_type as "representationType",
         c.identity_match_kind as "identityMatchKind",
         c.identity_evidence_json as "identityEvidence",
         c.permission_state as "permissionState",
         c.rights_basis as "rightsBasis",
         c.attribution_text as "attributionText",
         c.attribution_url as "attributionUrl", c.source_url as "sourceUrl",
         c.source_revision as "sourceRevision",
         c.source_policy_version as "sourcePolicyVersion",
         c.object_key as "objectKey",
         c.transformation_history_json as "transformationHistory",
         c.created_at as "createdAt", d.inspection_id as "inspectionId"
       from cover_candidates c
       join cover_decision_heads h on h.candidate_id = c.id
       join cover_decisions d on d.id = h.decision_id and d.state = 'eligible'
       where c.work_id = $1`,
      [workId],
    ),
  );
  const eligible: Array<{
    candidate: CandidateRow;
    inspection: InspectionRow;
  }> = [];
  for (const candidateRow of candidates) {
    const candidate: CandidateRow = {
      ...candidateRow,
      identityEvidence: jsonValue(candidateRow.identityEvidence),
      transformationHistory: jsonValue(candidateRow.transformationHistory),
    };
    const inspection = await loadInspection(sql, candidateRow.inspectionId);
    const validation = await currentValidation(
      sql,
      candidateInput(candidate),
      inspectionInput(inspection),
    );
    if (validation.gateCodes.length === 0) {
      eligible.push({ candidate, inspection });
    }
  }
  return eligible.sort((left, right) => {
    const representation =
      Number(right.candidate.representationType === "selected_edition") -
      Number(left.candidate.representationType === "selected_edition");
    if (representation !== 0) return representation;
    const identity =
      identityPriority(right.candidate.identityMatchKind) -
      identityPriority(left.candidate.identityMatchKind);
    if (identity !== 0) return identity;
    if (right.inspection.qualityScore !== left.inspection.qualityScore) {
      return right.inspection.qualityScore - left.inspection.qualityScore;
    }
    const area =
      (right.inspection.width ?? 0) * (right.inspection.height ?? 0) -
      (left.inspection.width ?? 0) * (left.inspection.height ?? 0);
    return (
      area ||
      left.inspection.checksum.localeCompare(right.inspection.checksum) ||
      left.candidate.id.localeCompare(right.candidate.id)
    );
  });
};

const loadProjection = async (
  sql: PgSql,
  workId: string,
): Promise<ProjectionRow | undefined> =>
  rows<ProjectionRow>(
    await sql.unsafe(
      `select p.id, p.candidate_id as "candidateId", p.state
       from cover_projection_heads h
       join cover_projections p on p.id = h.projection_id
       where h.work_id = $1`,
      [workId],
    ),
  )[0];

const appendProjection = async (
  sql: PgSql,
  input: {
    workId: string;
    candidateId: string | null;
    state: CoverSelection["state"];
    reasonCode: string;
    actorRef: string;
    projectedAt: number;
  },
): Promise<{ row: ProjectionRow; changed: boolean }> => {
  const previous = await loadProjection(sql, input.workId);
  if (
    previous?.candidateId === input.candidateId &&
    previous.state === input.state
  ) {
    return { row: previous, changed: false };
  }
  const id = deterministicCatalogId(
    "cover_projection",
    input.workId,
    hashCanonicalJson({
      candidateId: input.candidateId,
      state: input.state,
      previousProjectionId: previous?.id ?? null,
      reasonCode: input.reasonCode,
      policyVersion: COVER_POLICY_VERSION,
    }),
  );
  await sql.unsafe(
    `insert into cover_projections (
       id, work_id, candidate_id, state, previous_projection_id,
       reason_code, actor_ref, policy_version, projected_at
     ) values ($1, $2, $3, $4, $5, $6, $7, $8, $9)`,
    [
      id,
      input.workId,
      input.candidateId,
      input.state,
      previous?.id ?? null,
      input.reasonCode,
      input.actorRef,
      COVER_POLICY_VERSION,
      input.projectedAt,
    ],
  );
  await sql.unsafe(
    `insert into cover_projection_heads (work_id, projection_id)
     values ($1, $2)
     on conflict(work_id) do update set projection_id = excluded.projection_id`,
    [input.workId, id],
  );
  return {
    row: { id, candidateId: input.candidateId, state: input.state },
    changed: true,
  };
};

const recompute = async (
  sql: PgSql,
  input: {
    workId: string;
    actorRef: string;
    reasonCode: string;
    projectedAt: number;
    emptyState?: "placeholder" | "withdrawn";
  },
): Promise<{ selection: CoverSelection; changed: boolean }> => {
  const winner = (await eligibleCandidates(sql, input.workId))[0];
  const projection = await appendProjection(sql, {
    workId: input.workId,
    candidateId: winner?.candidate.id ?? null,
    state: winner ? "selected" : (input.emptyState ?? "placeholder"),
    reasonCode: input.reasonCode,
    actorRef: input.actorRef,
    projectedAt: input.projectedAt,
  });
  return {
    selection: {
      workId: input.workId,
      candidateId: winner?.candidate.id ?? null,
      objectKey: winner?.candidate.objectKey ?? PLACEHOLDER_COVER,
      representationType: winner?.candidate.representationType ?? null,
      editionId: winner?.candidate.editionId ?? null,
      rightsStatus:
        winner?.candidate.permissionState === "approved"
          ? "cleared"
          : "deferred_poc",
      rightsCleared: winner?.candidate.permissionState === "approved",
      publicDisplayEligible: Boolean(winner),
      state: projection.row.state,
    },
    changed: projection.changed,
  };
};

export const createCoverCandidatePostgres = async (input: {
  url: string;
  candidate: CoverCandidateInput;
  inspection: CoverInspection;
  actorRef?: string;
  failAfter?: "candidate" | "inspection" | "decision" | "projection";
}): Promise<CoverCandidateResult> => {
  const client = postgres(input.url, { max: 1 });
  const candidateId = coverCandidateIdentity(input.candidate);
  const inspectionId = coverInspectionIdentity(candidateId, input.inspection);
  try {
    const existing = await loadDecision(client, candidateId);
    if (existing?.inspectionId === inspectionId) {
      return {
        candidateId,
        inspectionId,
        decisionId: existing.id,
        state: existing.state,
        gateCodes: existing.gateCodes,
        warningCodes: existing.warningCodes,
        changed: false,
      };
    }
    return await client.begin(async (sql) => {
      await sql.unsafe(
        `insert into cover_candidates (
           id, work_id, edition_id, source_record_id, representation_type,
           identity_match_kind, identity_evidence_json, permission_state,
           rights_basis, attribution_text, attribution_url, source_url,
           source_revision, source_policy_version, object_key,
           transformation_history_json, created_at
         ) values (
           $1, $2, $3, $4, $5, $6, $7::jsonb, $8, $9, $10, $11, $12,
           $13, $14, $15, $16::jsonb, $17
         ) on conflict(id) do nothing`,
        [
          candidateId,
          input.candidate.workId,
          input.candidate.editionId,
          input.candidate.sourceRecordId,
          input.candidate.representationType,
          input.candidate.identityMatchKind,
          input.candidate.identityEvidence as postgres.JSONValue,
          input.candidate.permissionState,
          input.candidate.rightsBasis,
          input.candidate.attributionText,
          input.candidate.attributionUrl,
          input.candidate.sourceUrl,
          input.candidate.sourceRevision,
          input.candidate.sourcePolicyVersion,
          input.candidate.objectKey,
          [...input.candidate.transformationHistory],
          input.candidate.createdAt,
        ],
      );
      if (input.failAfter === "candidate") {
        throw new Error("Forced Postgres cover candidate failure");
      }
      const inspectionToStore = {
        ...input.inspection,
        flags: uniqueSorted(
          input.inspection.flags.filter((flag) => flag !== "duplicate"),
        ),
      };
      await sql.unsafe(
        `insert into cover_inspections (
           id, candidate_id, media_type, byte_size, width, height, aspect_ratio,
           checksum, decode_result, flags_json, quality_score,
           duplicate_of_candidate_id, inspection_version, inspected_at
         ) values (
           $1, $2, $3, $4, $5, $6, $7, $8, $9, $10::jsonb, $11, $12, $13, $14
         ) on conflict(candidate_id, checksum, inspection_version) do nothing`,
        [
          inspectionId,
          candidateId,
          inspectionToStore.mediaType,
          inspectionToStore.byteSize,
          inspectionToStore.width,
          inspectionToStore.height,
          inspectionToStore.aspectRatio,
          inspectionToStore.checksum,
          inspectionToStore.decodeResult,
          inspectionToStore.flags,
          inspectionToStore.qualityScore,
          null,
          inspectionToStore.inspectionVersion,
          inspectionToStore.inspectedAt,
        ],
      );
      if (input.failAfter === "inspection") {
        throw new Error("Forced Postgres cover inspection failure");
      }
      const duplicateNormalization = await normalizeDuplicateGroup(sql, {
        candidateId,
        checksum: input.inspection.checksum,
        decidedAt: input.inspection.inspectedAt,
        inspectionId,
      });
      const inspection = duplicateNormalization.inspection;
      const validation = await currentValidation(
        sql,
        input.candidate,
        inspection,
      );
      const state = decisionStateForValidation(validation);
      const decision = await appendDecision(sql, {
        candidateId,
        inspectionId,
        state,
        gateCodes: validation.gateCodes,
        warningCodes: validation.warningCodes,
        decidedAt: inspection.inspectedAt,
      });
      if (input.failAfter === "decision") {
        throw new Error("Forced Postgres cover decision failure");
      }
      for (const workId of uniqueSorted([
        input.candidate.workId,
        ...duplicateNormalization.affectedWorkIds,
      ])) {
        await recompute(sql, {
          workId,
          actorRef: input.actorRef ?? "system:cover-inspection",
          reasonCode: "candidate_inspected",
          projectedAt: inspection.inspectedAt,
        });
      }
      if (input.failAfter === "projection") {
        throw new Error("Forced Postgres cover projection failure");
      }
      return {
        candidateId,
        inspectionId,
        decisionId: decision.id,
        state,
        gateCodes: validation.gateCodes,
        warningCodes: validation.warningCodes,
        changed: true,
      };
    });
  } finally {
    await client.end({ timeout: 5_000 });
  }
};

export const reviewCoverCandidatePostgres = async (input: {
  url: string;
  candidateId: string;
  reviewerRef: string;
  decision: "approve" | "reject";
  reason: string;
  acknowledgedWarningCodes: readonly CoverFlagCode[];
  reviewedAt: number;
}): Promise<CoverCandidateResult> => {
  const client = postgres(input.url, { max: 1 });
  try {
    const candidateRow = await loadCandidate(client, input.candidateId);
    const previous = await loadDecision(client, input.candidateId);
    if (!candidateRow || !previous)
      throw new Error("Cover candidate not found");
    const candidate = candidateInput(candidateRow);
    const inspection = inspectionInput(
      await loadInspection(client, previous.inspectionId),
    );
    const validation = await currentValidation(client, candidate, inspection);
    if (input.decision === "approve") {
      if (validation.gateCodes.length > 0) {
        throw new Error(
          `Cover hard gates cannot be overridden: ${validation.gateCodes.join(", ")}`,
        );
      }
      const missing = validation.warningCodes.filter(
        (warning) => !input.acknowledgedWarningCodes.includes(warning),
      );
      if (missing.length > 0) {
        throw new Error(
          `Cover warnings not acknowledged: ${missing.join(", ")}`,
        );
      }
    }
    return await client.begin(async (sql) => {
      const state: CoverCandidateResult["state"] =
        input.decision === "approve" ? "eligible" : "rejected";
      const gateCodes =
        input.decision === "approve" ? [] : validation.gateCodes;
      const decision = await appendDecision(sql, {
        candidateId: input.candidateId,
        inspectionId: previous.inspectionId,
        state,
        gateCodes,
        warningCodes: validation.warningCodes,
        reviewerRef: input.reviewerRef,
        reason: input.reason,
        decidedAt: input.reviewedAt,
      });
      await recompute(sql, {
        workId: candidate.workId,
        actorRef: input.reviewerRef,
        reasonCode: `review_${input.decision}`,
        projectedAt: input.reviewedAt,
      });
      return {
        candidateId: input.candidateId,
        inspectionId: previous.inspectionId,
        decisionId: decision.id,
        state,
        gateCodes,
        warningCodes: validation.warningCodes,
        changed: decision.changed,
      };
    });
  } finally {
    await client.end({ timeout: 5_000 });
  }
};

export const getCoverSelectionPostgres = async (input: {
  url: string;
  workId: string;
}): Promise<CoverSelection> => {
  const client = postgres(input.url, { max: 1 });
  try {
    const projection = await loadProjection(client, input.workId);
    if (!projection?.candidateId) {
      return {
        workId: input.workId,
        candidateId: null,
        objectKey: PLACEHOLDER_COVER,
        representationType: null,
        editionId: null,
        rightsStatus: "deferred_poc",
        rightsCleared: false,
        publicDisplayEligible: false,
        state: projection?.state ?? "placeholder",
      };
    }
    const candidate = await loadCandidate(client, projection.candidateId);
    const decision = await loadDecision(client, projection.candidateId);
    const currentlyEligible =
      candidate &&
      decision?.state === "eligible" &&
      (
        await currentValidation(
          client,
          candidateInput(candidate),
          inspectionInput(await loadInspection(client, decision.inspectionId)),
        )
      ).gateCodes.length === 0;
    if (!currentlyEligible || !candidate) {
      return {
        workId: input.workId,
        candidateId: null,
        objectKey: PLACEHOLDER_COVER,
        representationType: null,
        editionId: null,
        rightsStatus: "deferred_poc",
        rightsCleared: false,
        publicDisplayEligible: false,
        state: "placeholder",
      };
    }
    return {
      workId: input.workId,
      candidateId: candidate.id,
      objectKey: candidate.objectKey,
      representationType: candidate.representationType,
      editionId: candidate.editionId,
      rightsStatus:
        candidate.permissionState === "approved" ? "cleared" : "deferred_poc",
      rightsCleared: candidate.permissionState === "approved",
      publicDisplayEligible: true,
      state: projection.state,
    };
  } finally {
    await client.end({ timeout: 5_000 });
  }
};

export const withdrawCoverCandidatePostgres = async (input: {
  url: string;
  candidateId: string;
  actorRef: string;
  reason: string;
  withdrawnAt: number;
  purgeAsset?: (objectKey: string) => void | Promise<void>;
}): Promise<CoverCandidateResult> => {
  const client = postgres(input.url, { max: 1 });
  try {
    const candidateRow = await loadCandidate(client, input.candidateId);
    const previous = await loadDecision(client, input.candidateId);
    if (!candidateRow || !previous)
      throw new Error("Cover candidate not found");
    if (previous.state === "withdrawn" && previous.purgeState !== "failed") {
      return {
        candidateId: input.candidateId,
        inspectionId: previous.inspectionId,
        decisionId: previous.id,
        state: "withdrawn",
        gateCodes: previous.gateCodes,
        warningCodes: previous.warningCodes,
        changed: false,
      };
    }
    const candidate = candidateInput(candidateRow);
    const context = await sourceContext(client, candidate);
    const purgeRequired = coverPolicyRequiresPurge(context?.assetPolicy);
    const decision = await client.begin(async (sql) => {
      const appended = await appendDecision(sql, {
        candidateId: input.candidateId,
        inspectionId: previous.inspectionId,
        state: "withdrawn",
        gateCodes: previous.gateCodes,
        warningCodes: previous.warningCodes,
        reviewerRef: input.actorRef,
        reason: input.reason,
        purgeState: purgeRequired ? "pending" : "not_required",
        decidedAt: input.withdrawnAt,
      });
      const remaining = await eligibleCandidates(sql, candidate.workId);
      await recompute(sql, {
        workId: candidate.workId,
        actorRef: input.actorRef,
        reasonCode: "candidate_withdrawn",
        projectedAt: input.withdrawnAt,
        emptyState: remaining.length > 0 ? "placeholder" : "withdrawn",
      });
      return appended;
    });
    if (purgeRequired) {
      try {
        if (!input.purgeAsset) {
          throw new Error("Cover withdrawal requires an asset purge callback");
        }
        await input.purgeAsset(candidate.objectKey);
        await client.unsafe(
          "update cover_decisions set purge_state = 'completed' where id = $1",
          [decision.id],
        );
      } catch (error) {
        await client.unsafe(
          "update cover_decisions set purge_state = 'failed' where id = $1",
          [decision.id],
        );
        throw error;
      }
    }
    return {
      candidateId: input.candidateId,
      inspectionId: previous.inspectionId,
      decisionId: decision.id,
      state: "withdrawn",
      gateCodes: previous.gateCodes,
      warningCodes: previous.warningCodes,
      changed: decision.changed,
    };
  } finally {
    await client.end({ timeout: 5_000 });
  }
};

export const retryCoverWithdrawalPurgePostgres = async (input: {
  url: string;
  candidateId: string;
  purgeAsset: (objectKey: string) => void | Promise<void>;
}): Promise<boolean> => {
  const client = postgres(input.url, { max: 1 });
  try {
    const candidate = await loadCandidate(client, input.candidateId);
    const decision = await loadDecision(client, input.candidateId);
    if (!candidate || !decision || decision.state !== "withdrawn") {
      throw new Error("Withdrawn cover candidate not found");
    }
    if (
      decision.purgeState === "completed" ||
      decision.purgeState === "not_required"
    ) {
      return false;
    }
    try {
      await input.purgeAsset(candidate.objectKey);
      await client.unsafe(
        "update cover_decisions set purge_state = 'completed' where id = $1",
        [decision.id],
      );
      return true;
    } catch (error) {
      await client.unsafe(
        "update cover_decisions set purge_state = 'failed' where id = $1",
        [decision.id],
      );
      throw error;
    }
  } finally {
    await client.end({ timeout: 5_000 });
  }
};

export const rollbackCoverProjectionPostgres = async (input: {
  url: string;
  workId: string;
  targetProjectionId: string;
  actorRef: string;
  reason: string;
  rolledBackAt: number;
}): Promise<{ selection: CoverSelection; changed: boolean }> => {
  const client = postgres(input.url, { max: 1 });
  try {
    return await client.begin(async (sql) => {
      const target = rows<ProjectionRow>(
        await sql.unsafe(
          `select id, candidate_id as "candidateId", state
           from cover_projections where id = $1 and work_id = $2`,
          [input.targetProjectionId, input.workId],
        ),
      )[0];
      if (!target?.candidateId) {
        throw new Error("Rollback target does not select a cover candidate");
      }
      const eligible = (await eligibleCandidates(sql, input.workId)).some(
        (row) => row.candidate.id === target.candidateId,
      );
      if (!eligible) throw new Error("Rollback target is no longer eligible");
      const current = await loadProjection(sql, input.workId);
      if (current?.candidateId === target.candidateId) {
        const candidate = await loadCandidate(sql, target.candidateId);
        if (!candidate) throw new Error("Rollback candidate not found");
        return {
          selection: {
            workId: input.workId,
            candidateId: candidate.id,
            objectKey: candidate.objectKey,
            representationType: candidate.representationType,
            editionId: candidate.editionId,
            rightsStatus:
              candidate.permissionState === "approved"
                ? "cleared"
                : "deferred_poc",
            rightsCleared: candidate.permissionState === "approved",
            publicDisplayEligible: true,
            state: current.state,
          },
          changed: false,
        };
      }
      const projection = await appendProjection(sql, {
        workId: input.workId,
        candidateId: target.candidateId,
        state: "rolled_back",
        reasonCode: input.reason,
        actorRef: input.actorRef,
        projectedAt: input.rolledBackAt,
      });
      const candidate = await loadCandidate(sql, target.candidateId);
      if (!candidate) throw new Error("Rollback candidate not found");
      return {
        selection: {
          workId: input.workId,
          candidateId: candidate.id,
          objectKey: candidate.objectKey,
          representationType: candidate.representationType,
          editionId: candidate.editionId,
          rightsStatus:
            candidate.permissionState === "approved"
              ? "cleared"
              : "deferred_poc",
          rightsCleared: candidate.permissionState === "approved",
          publicDisplayEligible: true,
          state: projection.row.state,
        },
        changed: projection.changed,
      };
    });
  } finally {
    await client.end({ timeout: 5_000 });
  }
};
