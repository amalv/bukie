import type Database from "better-sqlite3";
import { PLACEHOLDER_COVER } from "../../../../media/covers";
import {
  canonicalJson,
  deterministicCatalogId,
  hashCanonicalJson,
} from "../../identity";
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

type SqliteDatabase = InstanceType<typeof Database>;

type CandidateRow = {
  id: string;
  workId: string;
  editionId: string | null;
  sourceRecordId: string;
  representationType: "selected_edition" | "work_representative";
  identityMatchKind: CoverCandidateInput["identityMatchKind"];
  identityEvidenceJson: string;
  permissionState: CoverCandidateInput["permissionState"];
  rightsBasis: string | null;
  attributionText: string | null;
  attributionUrl: string | null;
  sourceUrl: string;
  sourceRevision: string;
  sourcePolicyVersion: string;
  objectKey: string;
  transformationHistoryJson: string;
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
  flagsJson: string;
  qualityScore: number;
  inspectionVersion: string;
  inspectedAt: number;
};

type DecisionRow = {
  id: string;
  candidateId: string;
  inspectionId: string;
  state: CoverCandidateResult["state"];
  gateCodesJson: string;
  warningCodesJson: string;
  purgeState: "not_required" | "pending" | "completed" | "failed";
};

type ProjectionRow = {
  id: string;
  workId: string;
  candidateId: string | null;
  state: CoverSelection["state"];
};

const parseJson = <T>(value: string): T => JSON.parse(value) as T;
const uniqueSorted = <T extends string>(values: readonly T[]): T[] =>
  [...new Set(values)].sort();

export const coverCandidateIdentity = (
  candidate: CoverCandidateInput,
): string =>
  deterministicCatalogId(
    "cover_candidate",
    candidate.sourceRecordId,
    hashCanonicalJson({
      workId: candidate.workId,
      editionId: candidate.editionId,
      representationType: candidate.representationType,
      identityMatchKind: candidate.identityMatchKind,
      identityEvidence: candidate.identityEvidence,
      permissionState: candidate.permissionState,
      rightsBasis: candidate.rightsBasis,
      attributionText: candidate.attributionText,
      attributionUrl: candidate.attributionUrl,
      sourceUrl: candidate.sourceUrl,
      sourceRevision: candidate.sourceRevision,
      sourcePolicyVersion: candidate.sourcePolicyVersion,
      objectKey: candidate.objectKey,
      transformationHistory: candidate.transformationHistory,
    }),
  );

export const coverInspectionIdentity = (
  candidateId: string,
  inspection: Pick<CoverInspection, "checksum" | "inspectionVersion">,
): string =>
  deterministicCatalogId(
    "cover_inspection",
    candidateId,
    `${inspection.checksum}:${inspection.inspectionVersion}`,
  );

const candidateFromRow = (row: CandidateRow): CoverCandidateInput => ({
  workId: row.workId,
  editionId: row.editionId,
  sourceRecordId: row.sourceRecordId,
  representationType: row.representationType,
  identityMatchKind: row.identityMatchKind,
  identityEvidence: parseJson(row.identityEvidenceJson),
  permissionState: row.permissionState,
  rightsBasis: row.rightsBasis,
  attributionText: row.attributionText,
  attributionUrl: row.attributionUrl,
  sourceUrl: row.sourceUrl,
  sourceRevision: row.sourceRevision,
  sourcePolicyVersion: row.sourcePolicyVersion,
  objectKey: row.objectKey,
  transformationHistory: parseJson(row.transformationHistoryJson),
  createdAt: row.createdAt,
});

const inspectionFromRow = (row: InspectionRow): CoverInspection => ({
  mediaType: row.mediaType,
  byteSize: row.byteSize,
  width: row.width,
  height: row.height,
  aspectRatio: row.aspectRatio,
  checksum: row.checksum,
  decodeResult: row.decodeResult,
  flags: parseJson(row.flagsJson),
  qualityScore: row.qualityScore,
  inspectionVersion: row.inspectionVersion,
  inspectedAt: row.inspectedAt,
});

const loadCandidate = (
  raw: SqliteDatabase,
  candidateId: string,
): CandidateRow | undefined =>
  raw
    .prepare(
      `select
         id, work_id as "workId", edition_id as "editionId",
         source_record_id as "sourceRecordId",
         representation_type as "representationType",
         identity_match_kind as "identityMatchKind",
         identity_evidence_json as "identityEvidenceJson",
         permission_state as "permissionState", rights_basis as "rightsBasis",
         attribution_text as "attributionText",
         attribution_url as "attributionUrl", source_url as "sourceUrl",
         source_revision as "sourceRevision",
         source_policy_version as "sourcePolicyVersion",
         object_key as "objectKey",
         transformation_history_json as "transformationHistoryJson",
         created_at as "createdAt"
       from cover_candidates where id = ?`,
    )
    .get(candidateId) as CandidateRow | undefined;

const loadInspection = (
  raw: SqliteDatabase,
  inspectionId: string,
): InspectionRow =>
  raw
    .prepare(
      `select
         id, candidate_id as "candidateId", media_type as "mediaType",
         byte_size as "byteSize", width, height, aspect_ratio as "aspectRatio",
         checksum, decode_result as "decodeResult", flags_json as "flagsJson",
         quality_score as "qualityScore",
         inspection_version as "inspectionVersion",
         inspected_at as "inspectedAt"
       from cover_inspections where id = ?`,
    )
    .get(inspectionId) as InspectionRow;

const loadDecision = (
  raw: SqliteDatabase,
  candidateId: string,
): DecisionRow | undefined =>
  raw
    .prepare(
      `select
         d.id, d.candidate_id as "candidateId",
         d.inspection_id as "inspectionId", d.state,
         d.gate_codes_json as "gateCodesJson",
         d.warning_codes_json as "warningCodesJson",
         d.purge_state as "purgeState"
       from cover_decision_heads h
       join cover_decisions d on d.id = h.decision_id
       where h.candidate_id = ?`,
    )
    .get(candidateId) as DecisionRow | undefined;

const sourceContext = (
  raw: SqliteDatabase,
  candidate: CoverCandidateInput,
): CoverSourceContext | undefined => {
  const targetType =
    candidate.representationType === "selected_edition" ? "edition" : "work";
  const targetId = candidate.editionId ?? candidate.workId;
  return raw
    .prepare(
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
        and sl.entity_type = ?
        and sl.entity_id = ?
       where sr.id = ?`,
    )
    .get(targetType, targetId, candidate.sourceRecordId) as
    | CoverSourceContext
    | undefined;
};

const editionBelongsToWork = (
  raw: SqliteDatabase,
  candidate: CoverCandidateInput,
): boolean =>
  candidate.editionId === null ||
  Boolean(
    raw
      .prepare("select 1 from editions where id = ? and work_id = ?")
      .get(candidate.editionId, candidate.workId),
  );

const identityEvidenceVerified = (
  raw: SqliteDatabase,
  candidate: CoverCandidateInput,
  source: CoverSourceContext | undefined,
): boolean => {
  if (candidate.identityMatchKind === "exact_isbn" && candidate.editionId) {
    const evidence = candidate.identityEvidence;
    return ["isbn10", "isbn13"].some((scheme) => {
      const value = evidence[scheme];
      return (
        typeof value === "string" &&
        Boolean(
          raw
            .prepare(
              `select 1 from edition_identifiers
               where edition_id = ? and scheme = ? and value_normalized = ?`,
            )
            .get(candidate.editionId, scheme, value),
        )
      );
    });
  }
  if (
    candidate.identityMatchKind === "provider_edition_relation" ||
    candidate.identityMatchKind === "provider_work_relation"
  ) {
    return source?.sourceLinkMatchKind === "source_relationship";
  }
  if (candidate.identityMatchKind === "approved_strong_edition_tuple") {
    return (
      candidate.identityEvidence.policyApproved === true &&
      source?.sourceLinkMatchKind === "curated"
    );
  }
  if (candidate.identityMatchKind === "curated_work_relation") {
    return source?.sourceLinkMatchKind === "curated";
  }
  return false;
};

const currentValidation = (
  raw: SqliteDatabase,
  candidate: CoverCandidateInput,
  inspection: CoverInspection,
) => {
  const source = sourceContext(raw, candidate);
  return validateCoverCandidate({
    candidate,
    inspection,
    source,
    editionBelongsToWork: editionBelongsToWork(raw, candidate),
    identityEvidenceVerified: identityEvidenceVerified(raw, candidate, source),
  });
};

const decisionIdentity = (input: {
  candidateId: string;
  inspectionId: string;
  state: CoverCandidateResult["state"];
  gateCodes: readonly CoverGateCode[];
  warningCodes: readonly CoverFlagCode[];
  reviewerRef: string | null;
  reason: string | null;
  previousDecisionId: string | null;
  decidedAt: number;
}): string =>
  deterministicCatalogId(
    "cover_decision",
    input.candidateId,
    hashCanonicalJson({
      ...input,
      policyVersion: COVER_POLICY_VERSION,
    }),
  );

const appendDecision = (
  raw: SqliteDatabase,
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
): { id: string; changed: boolean } => {
  const previous = loadDecision(raw, input.candidateId);
  const gateCodes = uniqueSorted(input.gateCodes);
  const warningCodes = uniqueSorted(input.warningCodes);
  if (
    previous &&
    previous.inspectionId === input.inspectionId &&
    previous.state === input.state &&
    previous.gateCodesJson === canonicalJson(gateCodes) &&
    previous.warningCodesJson === canonicalJson(warningCodes) &&
    previous.purgeState === (input.purgeState ?? "not_required")
  ) {
    return { id: previous.id, changed: false };
  }
  const id = decisionIdentity({
    candidateId: input.candidateId,
    inspectionId: input.inspectionId,
    state: input.state,
    gateCodes,
    warningCodes,
    reviewerRef: input.reviewerRef ?? null,
    reason: input.reason ?? null,
    previousDecisionId: previous?.id ?? null,
    decidedAt: input.decidedAt,
  });
  raw
    .prepare(
      `insert into cover_decisions (
         id, candidate_id, inspection_id, state, gate_codes_json,
         warning_codes_json, reviewer_ref, review_reason, purge_state,
         previous_decision_id, policy_version, decided_at
       ) values (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    )
    .run(
      id,
      input.candidateId,
      input.inspectionId,
      input.state,
      canonicalJson(gateCodes),
      canonicalJson(warningCodes),
      input.reviewerRef ?? null,
      input.reason ?? null,
      input.purgeState ?? "not_required",
      previous?.id ?? null,
      COVER_POLICY_VERSION,
      input.decidedAt,
    );
  raw
    .prepare(
      `insert into cover_decision_heads (candidate_id, decision_id)
       values (?, ?)
       on conflict(candidate_id) do update set decision_id = excluded.decision_id`,
    )
    .run(input.candidateId, id);
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

const normalizeDuplicateGroup = (
  raw: SqliteDatabase,
  input: {
    candidateId: string;
    checksum: string;
    decidedAt: number;
    inspectionId: string;
  },
): { inspection: CoverInspection; affectedWorkIds: string[] } => {
  const group = raw
    .prepare(
      `select
         i.id, i.candidate_id as "candidateId", i.media_type as "mediaType",
         i.byte_size as "byteSize", i.width, i.height,
         i.aspect_ratio as "aspectRatio", i.checksum,
         i.decode_result as "decodeResult", i.flags_json as "flagsJson",
         i.quality_score as "qualityScore",
         i.inspection_version as "inspectionVersion",
         i.inspected_at as "inspectedAt", c.work_id as "workId"
       from cover_inspections i
       join cover_candidates c on c.id = i.candidate_id
       left join cover_decision_heads h on h.candidate_id = i.candidate_id
       left join cover_decisions d on d.id = h.decision_id
       where i.checksum = ?
         and (
           (i.candidate_id = ? and i.id = ?)
           or (i.candidate_id <> ? and d.inspection_id = i.id)
         )
       order by i.candidate_id asc, i.id asc`,
    )
    .all(
      input.checksum,
      input.candidateId,
      input.inspectionId,
      input.candidateId,
    ) as Array<InspectionRow & { workId: string }>;
  const canonicalCandidateId = group[0]?.candidateId;
  const affectedWorkIds = new Set<string>();

  for (const row of group) {
    const baseFlags = parseJson<CoverFlagCode[]>(row.flagsJson).filter(
      (flag) => flag !== "duplicate",
    );
    const isDuplicate = row.candidateId !== canonicalCandidateId;
    const flags = uniqueSorted([
      ...baseFlags,
      ...(isDuplicate ? (["duplicate"] as const) : []),
    ]);
    raw
      .prepare(
        `update cover_inspections
         set flags_json = ?, duplicate_of_candidate_id = ?
         where id = ?`,
      )
      .run(
        canonicalJson(flags),
        isDuplicate ? canonicalCandidateId : null,
        row.id,
      );

    if (row.candidateId === input.candidateId) continue;
    const previous = loadDecision(raw, row.candidateId);
    const candidateRow = loadCandidate(raw, row.candidateId);
    if (
      !previous ||
      !candidateRow ||
      !["eligible", "review_required"].includes(previous.state)
    ) {
      continue;
    }
    const inspection = inspectionFromRow({
      ...row,
      flagsJson: canonicalJson(flags),
    });
    const validation = currentValidation(
      raw,
      candidateFromRow(candidateRow),
      inspection,
    );
    appendDecision(raw, {
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
    inspection: inspectionFromRow({
      ...current,
      flagsJson: canonicalJson(
        uniqueSorted([
          ...parseJson<CoverFlagCode[]>(current.flagsJson).filter(
            (flag) => flag !== "duplicate",
          ),
          ...(current.candidateId !== canonicalCandidateId
            ? (["duplicate"] as const)
            : []),
        ]),
      ),
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

const eligibleCandidates = (
  raw: SqliteDatabase,
  workId: string,
): Array<{
  candidate: CandidateRow;
  inspection: InspectionRow;
}> => {
  const rows = raw
    .prepare(
      `select
         c.id, c.work_id as "workId", c.edition_id as "editionId",
         c.source_record_id as "sourceRecordId",
         c.representation_type as "representationType",
         c.identity_match_kind as "identityMatchKind",
         c.identity_evidence_json as "identityEvidenceJson",
         c.permission_state as "permissionState",
         c.rights_basis as "rightsBasis",
         c.attribution_text as "attributionText",
         c.attribution_url as "attributionUrl", c.source_url as "sourceUrl",
         c.source_revision as "sourceRevision",
         c.source_policy_version as "sourcePolicyVersion",
         c.object_key as "objectKey",
         c.transformation_history_json as "transformationHistoryJson",
         c.created_at as "createdAt",
         i.id as "inspectionId", i.media_type as "mediaType",
         i.byte_size as "byteSize", i.width, i.height,
         i.aspect_ratio as "aspectRatio", i.checksum,
         i.decode_result as "decodeResult", i.flags_json as "flagsJson",
         i.quality_score as "qualityScore",
         i.inspection_version as "inspectionVersion",
         i.inspected_at as "inspectedAt"
       from cover_candidates c
       join cover_decision_heads dh on dh.candidate_id = c.id
       join cover_decisions d on d.id = dh.decision_id and d.state = 'eligible'
       join cover_inspections i on i.id = d.inspection_id
       where c.work_id = ?`,
    )
    .all(workId) as Array<
    CandidateRow &
      Omit<InspectionRow, "id" | "candidateId"> & { inspectionId: string }
  >;
  const eligible: Array<{
    candidate: CandidateRow;
    inspection: InspectionRow;
  }> = [];
  for (const row of rows) {
    const candidate = candidateFromRow(row);
    const inspectionRow: InspectionRow = {
      id: row.inspectionId,
      candidateId: row.id,
      mediaType: row.mediaType,
      byteSize: row.byteSize,
      width: row.width,
      height: row.height,
      aspectRatio: row.aspectRatio,
      checksum: row.checksum,
      decodeResult: row.decodeResult,
      flagsJson: row.flagsJson,
      qualityScore: row.qualityScore,
      inspectionVersion: row.inspectionVersion,
      inspectedAt: row.inspectedAt,
    };
    const validation = currentValidation(
      raw,
      candidate,
      inspectionFromRow(inspectionRow),
    );
    if (validation.gateCodes.length === 0) {
      eligible.push({ candidate: row, inspection: inspectionRow });
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
    if (area !== 0) return area;
    const checksum = left.inspection.checksum.localeCompare(
      right.inspection.checksum,
    );
    return checksum || left.candidate.id.localeCompare(right.candidate.id);
  });
};

const loadProjection = (
  raw: SqliteDatabase,
  workId: string,
): ProjectionRow | undefined =>
  raw
    .prepare(
      `select p.id, p.work_id as "workId", p.candidate_id as "candidateId",
              p.state
       from cover_projection_heads h
       join cover_projections p on p.id = h.projection_id
       where h.work_id = ?`,
    )
    .get(workId) as ProjectionRow | undefined;

const appendProjection = (
  raw: SqliteDatabase,
  input: {
    workId: string;
    candidateId: string | null;
    state: CoverSelection["state"];
    reasonCode: string;
    actorRef: string;
    projectedAt: number;
  },
): { row: ProjectionRow; changed: boolean } => {
  const previous = loadProjection(raw, input.workId);
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
  raw
    .prepare(
      `insert into cover_projections (
         id, work_id, candidate_id, state, previous_projection_id,
         reason_code, actor_ref, policy_version, projected_at
       ) values (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    )
    .run(
      id,
      input.workId,
      input.candidateId,
      input.state,
      previous?.id ?? null,
      input.reasonCode,
      input.actorRef,
      COVER_POLICY_VERSION,
      input.projectedAt,
    );
  raw
    .prepare(
      `insert into cover_projection_heads (work_id, projection_id)
       values (?, ?)
       on conflict(work_id) do update set projection_id = excluded.projection_id`,
    )
    .run(input.workId, id);
  return {
    row: {
      id,
      workId: input.workId,
      candidateId: input.candidateId,
      state: input.state,
    },
    changed: true,
  };
};

export const recomputeCoverSelectionSqlite = (
  raw: SqliteDatabase,
  input: {
    workId: string;
    actorRef: string;
    reasonCode: string;
    projectedAt: number;
    emptyState?: "placeholder" | "withdrawn";
  },
): { selection: CoverSelection; changed: boolean } => {
  const winner = eligibleCandidates(raw, input.workId)[0];
  const projection = appendProjection(raw, {
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
      publicDisplayEligible: false,
      state: projection.row.state,
    },
    changed: projection.changed,
  };
};

export const createCoverCandidateSqlite = (
  raw: SqliteDatabase,
  input: {
    candidate: CoverCandidateInput;
    inspection: CoverInspection;
    actorRef?: string;
    failAfter?: "candidate" | "inspection" | "decision" | "projection";
  },
): CoverCandidateResult => {
  const candidateId = coverCandidateIdentity(input.candidate);
  const inspectionId = coverInspectionIdentity(candidateId, input.inspection);
  const existing = loadDecision(raw, candidateId);
  if (existing && existing.inspectionId === inspectionId) {
    return {
      candidateId,
      inspectionId,
      decisionId: existing.id,
      state: existing.state,
      gateCodes: parseJson(existing.gateCodesJson),
      warningCodes: parseJson(existing.warningCodesJson),
      changed: false,
    };
  }

  return raw.transaction(() => {
    raw
      .prepare(
        `insert into cover_candidates (
           id, work_id, edition_id, source_record_id, representation_type,
           identity_match_kind, identity_evidence_json, permission_state,
           rights_basis, attribution_text, attribution_url, source_url,
           source_revision, source_policy_version, object_key,
           transformation_history_json, created_at
         ) values (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
         on conflict(id) do nothing`,
      )
      .run(
        candidateId,
        input.candidate.workId,
        input.candidate.editionId,
        input.candidate.sourceRecordId,
        input.candidate.representationType,
        input.candidate.identityMatchKind,
        canonicalJson(input.candidate.identityEvidence),
        input.candidate.permissionState,
        input.candidate.rightsBasis,
        input.candidate.attributionText,
        input.candidate.attributionUrl,
        input.candidate.sourceUrl,
        input.candidate.sourceRevision,
        input.candidate.sourcePolicyVersion,
        input.candidate.objectKey,
        canonicalJson(input.candidate.transformationHistory),
        input.candidate.createdAt,
      );
    if (input.failAfter === "candidate") {
      throw new Error("Forced SQLite cover candidate failure");
    }
    const inspectionToStore = {
      ...input.inspection,
      flags: uniqueSorted(
        input.inspection.flags.filter((flag) => flag !== "duplicate"),
      ),
    };
    raw
      .prepare(
        `insert into cover_inspections (
           id, candidate_id, media_type, byte_size, width, height, aspect_ratio,
           checksum, decode_result, flags_json, quality_score,
           duplicate_of_candidate_id, inspection_version, inspected_at
         ) values (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
         on conflict(candidate_id, checksum, inspection_version) do nothing`,
      )
      .run(
        inspectionId,
        candidateId,
        inspectionToStore.mediaType,
        inspectionToStore.byteSize,
        inspectionToStore.width,
        inspectionToStore.height,
        inspectionToStore.aspectRatio,
        inspectionToStore.checksum,
        inspectionToStore.decodeResult,
        canonicalJson(inspectionToStore.flags),
        inspectionToStore.qualityScore,
        null,
        inspectionToStore.inspectionVersion,
        inspectionToStore.inspectedAt,
      );
    if (input.failAfter === "inspection") {
      throw new Error("Forced SQLite cover inspection failure");
    }
    const duplicateNormalization = normalizeDuplicateGroup(raw, {
      candidateId,
      checksum: input.inspection.checksum,
      decidedAt: input.inspection.inspectedAt,
      inspectionId,
    });
    const inspection = duplicateNormalization.inspection;
    const validation = currentValidation(raw, input.candidate, inspection);
    const state = decisionStateForValidation(validation);
    const decision = appendDecision(raw, {
      candidateId,
      inspectionId,
      state,
      gateCodes: validation.gateCodes,
      warningCodes: validation.warningCodes,
      decidedAt: input.inspection.inspectedAt,
    });
    if (input.failAfter === "decision") {
      throw new Error("Forced SQLite cover decision failure");
    }
    for (const workId of uniqueSorted([
      input.candidate.workId,
      ...duplicateNormalization.affectedWorkIds,
    ])) {
      recomputeCoverSelectionSqlite(raw, {
        workId,
        actorRef: input.actorRef ?? "system:cover-inspection",
        reasonCode: "candidate_inspected",
        projectedAt: input.inspection.inspectedAt,
      });
    }
    if (input.failAfter === "projection") {
      throw new Error("Forced SQLite cover projection failure");
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
  })();
};

export const reviewCoverCandidateSqlite = (
  raw: SqliteDatabase,
  input: {
    candidateId: string;
    reviewerRef: string;
    decision: "approve" | "reject";
    reason: string;
    acknowledgedWarningCodes: readonly CoverFlagCode[];
    reviewedAt: number;
  },
): CoverCandidateResult => {
  const candidateRow = loadCandidate(raw, input.candidateId);
  const previous = loadDecision(raw, input.candidateId);
  if (!candidateRow || !previous) throw new Error("Cover candidate not found");
  const inspectionRow = loadInspection(raw, previous.inspectionId);
  const candidate = candidateFromRow(candidateRow);
  const inspection = inspectionFromRow(inspectionRow);
  const validation = currentValidation(raw, candidate, inspection);
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
      throw new Error(`Cover warnings not acknowledged: ${missing.join(", ")}`);
    }
  }
  return raw.transaction(() => {
    const state: CoverCandidateResult["state"] =
      input.decision === "approve" ? "eligible" : "rejected";
    const decision = appendDecision(raw, {
      candidateId: input.candidateId,
      inspectionId: previous.inspectionId,
      state,
      gateCodes: input.decision === "approve" ? [] : validation.gateCodes,
      warningCodes: validation.warningCodes,
      reviewerRef: input.reviewerRef,
      reason: input.reason,
      decidedAt: input.reviewedAt,
    });
    recomputeCoverSelectionSqlite(raw, {
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
      gateCodes: input.decision === "approve" ? [] : validation.gateCodes,
      warningCodes: validation.warningCodes,
      changed: decision.changed,
    };
  })();
};

export const getCoverSelectionSqlite = (
  raw: SqliteDatabase,
  workId: string,
): CoverSelection => {
  const projection = loadProjection(raw, workId);
  if (!projection?.candidateId) {
    return {
      workId,
      candidateId: null,
      objectKey: PLACEHOLDER_COVER,
      representationType: null,
      editionId: null,
      publicDisplayEligible: false,
      state: projection?.state ?? "placeholder",
    };
  }
  const candidate = loadCandidate(raw, projection.candidateId);
  const decision = loadDecision(raw, projection.candidateId);
  const currentlyEligible =
    candidate &&
    decision?.state === "eligible" &&
    currentValidation(
      raw,
      candidateFromRow(candidate),
      inspectionFromRow(loadInspection(raw, decision.inspectionId)),
    ).gateCodes.length === 0;
  if (!currentlyEligible || !candidate) {
    return {
      workId,
      candidateId: null,
      objectKey: PLACEHOLDER_COVER,
      representationType: null,
      editionId: null,
      publicDisplayEligible: false,
      state: "placeholder",
    };
  }
  return {
    workId,
    candidateId: candidate.id,
    objectKey: candidate.objectKey,
    representationType: candidate.representationType,
    editionId: candidate.editionId,
    publicDisplayEligible: false,
    state: projection.state,
  };
};

export const withdrawCoverCandidateSqlite = async (
  raw: SqliteDatabase,
  input: {
    candidateId: string;
    actorRef: string;
    reason: string;
    withdrawnAt: number;
    purgeAsset?: (objectKey: string) => void | Promise<void>;
  },
): Promise<CoverCandidateResult> => {
  const candidateRow = loadCandidate(raw, input.candidateId);
  const previous = loadDecision(raw, input.candidateId);
  if (!candidateRow || !previous) throw new Error("Cover candidate not found");
  if (previous.state === "withdrawn" && previous.purgeState !== "failed") {
    return {
      candidateId: input.candidateId,
      inspectionId: previous.inspectionId,
      decisionId: previous.id,
      state: "withdrawn",
      gateCodes: parseJson(previous.gateCodesJson),
      warningCodes: parseJson(previous.warningCodesJson),
      changed: false,
    };
  }
  const candidate = candidateFromRow(candidateRow);
  const context = sourceContext(raw, candidate);
  const purgeRequired = coverPolicyRequiresPurge(context?.assetPolicy);
  const result = raw.transaction(() => {
    const decision = appendDecision(raw, {
      candidateId: input.candidateId,
      inspectionId: previous.inspectionId,
      state: "withdrawn",
      gateCodes: parseJson(previous.gateCodesJson),
      warningCodes: parseJson(previous.warningCodesJson),
      reviewerRef: input.actorRef,
      reason: input.reason,
      purgeState: purgeRequired ? "pending" : "not_required",
      decidedAt: input.withdrawnAt,
    });
    const remaining = eligibleCandidates(raw, candidate.workId);
    recomputeCoverSelectionSqlite(raw, {
      workId: candidate.workId,
      actorRef: input.actorRef,
      reasonCode: "candidate_withdrawn",
      projectedAt: input.withdrawnAt,
      emptyState: remaining.length > 0 ? "placeholder" : "withdrawn",
    });
    return decision;
  })();
  if (purgeRequired) {
    try {
      if (!input.purgeAsset) {
        throw new Error("Cover withdrawal requires an asset purge callback");
      }
      await input.purgeAsset(candidate.objectKey);
      raw
        .prepare(
          "update cover_decisions set purge_state = 'completed' where id = ?",
        )
        .run(result.id);
    } catch (error) {
      raw
        .prepare(
          "update cover_decisions set purge_state = 'failed' where id = ?",
        )
        .run(result.id);
      throw error;
    }
  }
  const current = loadDecision(raw, input.candidateId) as DecisionRow;
  return {
    candidateId: input.candidateId,
    inspectionId: current.inspectionId,
    decisionId: current.id,
    state: "withdrawn",
    gateCodes: parseJson(current.gateCodesJson),
    warningCodes: parseJson(current.warningCodesJson),
    changed: result.changed,
  };
};

export const retryCoverWithdrawalPurgeSqlite = async (
  raw: SqliteDatabase,
  input: {
    candidateId: string;
    purgeAsset: (objectKey: string) => void | Promise<void>;
  },
): Promise<boolean> => {
  const candidate = loadCandidate(raw, input.candidateId);
  const decision = loadDecision(raw, input.candidateId);
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
    raw
      .prepare(
        "update cover_decisions set purge_state = 'completed' where id = ?",
      )
      .run(decision.id);
    return true;
  } catch (error) {
    raw
      .prepare("update cover_decisions set purge_state = 'failed' where id = ?")
      .run(decision.id);
    throw error;
  }
};

export const rollbackCoverProjectionSqlite = (
  raw: SqliteDatabase,
  input: {
    workId: string;
    targetProjectionId: string;
    actorRef: string;
    reason: string;
    rolledBackAt: number;
  },
): { selection: CoverSelection; changed: boolean } => {
  const target = raw
    .prepare(
      `select id, work_id as "workId", candidate_id as "candidateId", state
       from cover_projections where id = ? and work_id = ?`,
    )
    .get(input.targetProjectionId, input.workId) as ProjectionRow | undefined;
  if (!target?.candidateId) {
    throw new Error("Rollback target does not select a cover candidate");
  }
  const eligible = eligibleCandidates(raw, input.workId).some(
    (row) => row.candidate.id === target.candidateId,
  );
  if (!eligible) throw new Error("Rollback target is no longer eligible");
  const current = loadProjection(raw, input.workId);
  if (current?.candidateId === target.candidateId) {
    return {
      selection: getCoverSelectionSqlite(raw, input.workId),
      changed: false,
    };
  }
  const projection = appendProjection(raw, {
    workId: input.workId,
    candidateId: target.candidateId,
    state: "rolled_back",
    reasonCode: input.reason,
    actorRef: input.actorRef,
    projectedAt: input.rolledBackAt,
  });
  return {
    selection: getCoverSelectionSqlite(raw, input.workId),
    changed: projection.changed,
  };
};
