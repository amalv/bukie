import type Database from "better-sqlite3";
import {
  canonicalJson,
  deterministicCatalogId,
  hashCanonicalJson,
} from "../../identity";
import { sourcePolicyAllowsFieldDisplay } from "../../policy-eligibility";
import type {
  DescriptionDecisionState,
  DescriptionProjectionState,
} from "../../values";
import type {
  DescriptionCandidateInput,
  DescriptionCandidateResult,
  DescriptionMetrics,
  DescriptionParentEvidence,
  DescriptionRejectionCode,
  DescriptionValidationResult,
  DescriptionWarningCode,
} from "./types";
import {
  descriptionGenerationInputHash,
  validateDescriptionCandidate,
} from "./validation";

type SqliteDatabase = InstanceType<typeof Database>;

type SourceContextRow = {
  sourceRecordId: string;
  sourceRevision: string | null;
  sourceRecordState: "active" | "withdrawn" | "deleted";
  sourceApproval: "pending" | "approved" | "suspended" | "retired";
  metadataPolicy: string;
  sourceLinkState: "active" | "candidate" | "rejected" | null;
};

type DecisionRow = {
  id: string;
  state: DescriptionDecisionState;
  rejectionCodesJson: string;
  warningCodesJson: string;
  reviewerRef: string | null;
  reviewReason: string | null;
  policyVersion: string;
};

type CandidateRow = {
  id: string;
  workId: string;
  observationId: string;
  descriptionClass:
    | "licensed_verbatim"
    | "bukie_editorial"
    | "model_assisted_candidate";
  textContent: string;
  textHash: string;
  sourceRevision: string;
  sourcePolicyVersion: string;
  descriptionPolicyVersion: string;
  editorRef: string | null;
  modelId: string | null;
  modelVersion: string | null;
  promptVersion: string | null;
  qualityScore: number | null;
};

type ParentRow = {
  id: string;
  entityType: string;
  entityId: string;
  workId: string | null;
  fieldKey: string;
  valueJson: string;
  observationState: "active" | "stale" | "withdrawn" | "invalid";
  provenanceKind: "curated" | "imported" | "derived" | "synthetic";
  sourceRecordState: "active" | "withdrawn" | "deleted";
  sourceApproval: "pending" | "approved" | "suspended" | "retired";
  sourceLinkState: "active" | "candidate" | "rejected" | null;
  metadataPolicy: string;
  resolutionState:
    | "present"
    | "missing"
    | "conflicting"
    | "stale"
    | "withdrawn"
    | null;
};

type ProjectionRow = {
  id: string;
  candidateId: string | null;
  state: DescriptionProjectionState;
};

type QueueOutcome =
  | "not_required"
  | "queued"
  | "deduplicated"
  | "overflow_paused";

const parseJson = <T>(value: string): T => JSON.parse(value) as T;

const uniqueSorted = <T extends string>(values: readonly T[]): T[] =>
  [...new Set(values)].sort();

const sourcePolicy = (
  value: string,
): {
  sourcePolicyVersion?: unknown;
  proposedEvidenceOnly?: unknown;
  textPermission?: {
    allowedFields?: unknown;
    fetch?: unknown;
    transform?: unknown;
  };
  attribution?: {
    required?: unknown;
  };
} => {
  try {
    const parsed: unknown = JSON.parse(value);
    return parsed && typeof parsed === "object" && !Array.isArray(parsed)
      ? parsed
      : {};
  } catch {
    return {};
  }
};

const sourceContext = (
  raw: SqliteDatabase,
  sourceRecordId: string,
  workId: string,
): SourceContextRow | undefined =>
  raw
    .prepare(
      `select
         sr.id as "sourceRecordId",
         sr.source_revision as "sourceRevision",
         sr.state as "sourceRecordState",
         s.approval_state as "sourceApproval",
         s.metadata_policy as "metadataPolicy",
         sl.state as "sourceLinkState"
       from source_records sr
       join metadata_sources s on s.id = sr.source_id
       left join source_record_links sl
         on sl.source_record_id = sr.id
        and sl.entity_type = 'work'
        and sl.entity_id = ?
       where sr.id = ?`,
    )
    .get(workId, sourceRecordId) as SourceContextRow | undefined;

const sourceAllowsCandidate = (
  context: SourceContextRow | undefined,
  input: DescriptionCandidateInput,
): boolean => {
  if (
    !context ||
    context.sourceApproval !== "approved" ||
    context.sourceRecordState !== "active" ||
    context.sourceLinkState !== "active"
  ) {
    return false;
  }
  const policy = sourcePolicy(context.metadataPolicy);
  return Boolean(
    policy.sourcePolicyVersion === input.sourcePolicyVersion &&
      policy.textPermission?.fetch === true &&
      Array.isArray(policy.textPermission.allowedFields) &&
      policy.textPermission.allowedFields.includes("work.description"),
  );
};

const candidateSourceIsCurrentlyUsable = (
  context: SourceContextRow | undefined,
  expectedPolicyVersion: string,
): boolean => {
  if (
    !context ||
    context.sourceApproval !== "approved" ||
    context.sourceRecordState !== "active" ||
    context.sourceLinkState !== "active"
  ) {
    return false;
  }
  const policy = sourcePolicy(context.metadataPolicy);
  return Boolean(
    policy.sourcePolicyVersion === expectedPolicyVersion &&
      policy.textPermission?.fetch === true &&
      Array.isArray(policy.textPermission.allowedFields) &&
      policy.textPermission.allowedFields.includes("work.description"),
  );
};

const loadParents = (
  raw: SqliteDatabase,
  ids: readonly string[],
): DescriptionParentEvidence[] => {
  const uniqueIds = uniqueSorted(ids);
  if (uniqueIds.length === 0) return [];
  const placeholders = uniqueIds.map(() => "?").join(", ");
  const rows = raw
    .prepare(
      `select
         o.id as "id",
         o.entity_type as "entityType",
         o.entity_id as "entityId",
         case
           when o.entity_type = 'work' then o.entity_id
           when o.entity_type = 'edition' then e.work_id
           else null
         end as "workId",
         o.field_key as "fieldKey",
         o.value_json as "valueJson",
         o.state as "observationState",
         o.provenance_kind as "provenanceKind",
         sr.state as "sourceRecordState",
         s.approval_state as "sourceApproval",
         sl.state as "sourceLinkState",
         s.metadata_policy as "metadataPolicy",
         r.state as "resolutionState"
       from field_observations o
       join source_records sr on sr.id = o.source_record_id
       join metadata_sources s on s.id = sr.source_id
       left join editions e
         on o.entity_type = 'edition' and e.id = o.entity_id
       left join source_record_links sl
         on sl.source_record_id = sr.id
        and sl.entity_type = o.entity_type
        and sl.entity_id = o.entity_id
       left join field_resolution_heads h
         on h.entity_type = o.entity_type
        and h.entity_id = o.entity_id
        and h.field_key = o.field_key
       left join field_resolutions r on r.id = h.resolution_id
       where o.id in (${placeholders})
       order by o.id`,
    )
    .all(...uniqueIds) as ParentRow[];
  return rows.map((row) => {
    const value = parseJson<unknown>(row.valueJson);
    return {
      id: row.id,
      entityType: row.entityType,
      entityId: row.entityId,
      workId: row.workId,
      fieldKey: row.fieldKey,
      value,
      sourceText: typeof value === "string" ? value : null,
      eligible:
        (row.observationState === "active" ||
          row.observationState === "stale") &&
        row.provenanceKind !== "synthetic" &&
        row.sourceRecordState === "active" &&
        row.sourceApproval === "approved" &&
        row.sourceLinkState === "active" &&
        sourcePolicyAllowsFieldDisplay(row.metadataPolicy, row.fieldKey),
      unresolvedConflict: row.resolutionState === "conflicting",
    };
  });
};

export const descriptionCandidateIdentity = (
  input: DescriptionCandidateInput,
): string =>
  deterministicCatalogId(
    "description_candidate",
    input.workId,
    hashCanonicalJson({
      ambiguousIdentity: input.ambiguousIdentity ?? false,
      claims: input.claims,
      comparisonTextHashes: input.comparisonTexts
        .map((text) => hashCanonicalJson(text))
        .sort(),
      descriptionClass: input.descriptionClass,
      descriptionPolicyVersion: input.descriptionPolicyVersion,
      provenance:
        input.descriptionClass === "licensed_verbatim"
          ? input.license
          : input.descriptionClass === "bukie_editorial"
            ? input.editorial
            : input.model,
      sensitiveContent: input.sensitiveContent ?? false,
      sourcePolicyVersion: input.sourcePolicyVersion,
      sourceRecordId: input.sourceRecordId,
      sourceRevision: input.sourceRevision,
      textHash: hashCanonicalJson(input.text),
    }),
  );

export const descriptionObservationIdentity = (candidateId: string): string =>
  deterministicCatalogId("field_observation", candidateId, "work.description");

export const descriptionDecisionIdentity = (input: {
  candidateId: string;
  previousDecisionId: string | null;
  state: DescriptionDecisionState;
  rejectionCodes: readonly string[];
  warningCodes: readonly string[];
  reviewerRef: string | null;
  reviewReason: string | null;
  policyVersion: string;
}): string =>
  deterministicCatalogId(
    "description_decision",
    input.candidateId,
    hashCanonicalJson(input),
  );

export const descriptionProjectionIdentity = (input: {
  workId: string;
  candidateId: string | null;
  previousProjectionId: string | null;
  state: DescriptionProjectionState;
  reasonCode: string;
  policyVersion: string;
}): string =>
  deterministicCatalogId(
    "description_projection",
    input.workId,
    hashCanonicalJson(input),
  );

const currentDecision = (
  raw: SqliteDatabase,
  candidateId: string,
): DecisionRow | undefined =>
  raw
    .prepare(
      `select
         d.id as "id",
         d.state as "state",
         d.rejection_codes_json as "rejectionCodesJson",
         d.warning_codes_json as "warningCodesJson",
         d.reviewer_ref as "reviewerRef",
         d.review_reason as "reviewReason",
         d.policy_version as "policyVersion"
       from description_decision_heads h
       join description_decisions d on d.id = h.decision_id
       where h.candidate_id = ?`,
    )
    .get(candidateId) as DecisionRow | undefined;

const currentProjection = (
  raw: SqliteDatabase,
  workId: string,
): ProjectionRow | undefined =>
  raw
    .prepare(
      `select
         p.id as "id",
         p.candidate_id as "candidateId",
         p.state as "state"
       from description_projection_heads h
       join description_projections p on p.id = h.projection_id
       where h.work_id = ?`,
    )
    .get(workId) as ProjectionRow | undefined;

const writeDecision = (
  raw: SqliteDatabase,
  input: {
    candidateId: string;
    state: DescriptionDecisionState;
    rejectionCodes: readonly string[];
    warningCodes: readonly string[];
    reviewerRef?: string | null;
    reviewReason?: string | null;
    policyVersion: string;
    decidedAt: number;
  },
): { id: string; changed: boolean } => {
  const previous = currentDecision(raw, input.candidateId);
  const rejectionCodes = uniqueSorted(input.rejectionCodes);
  const warningCodes = uniqueSorted(input.warningCodes);
  if (
    previous?.state === input.state &&
    previous.policyVersion === input.policyVersion &&
    previous.reviewerRef === (input.reviewerRef ?? null) &&
    previous.reviewReason === (input.reviewReason ?? null) &&
    canonicalJson(parseJson(previous.rejectionCodesJson)) ===
      canonicalJson(rejectionCodes) &&
    canonicalJson(parseJson(previous.warningCodesJson)) ===
      canonicalJson(warningCodes)
  ) {
    return { id: previous.id, changed: false };
  }
  const id = descriptionDecisionIdentity({
    candidateId: input.candidateId,
    previousDecisionId: previous?.id ?? null,
    state: input.state,
    rejectionCodes,
    warningCodes,
    reviewerRef: input.reviewerRef ?? null,
    reviewReason: input.reviewReason ?? null,
    policyVersion: input.policyVersion,
  });
  raw
    .prepare(
      `insert into description_decisions (
         id, candidate_id, state, rejection_codes_json, warning_codes_json,
         reviewer_ref, review_reason, previous_decision_id, policy_version,
         decided_at
       ) values (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    )
    .run(
      id,
      input.candidateId,
      input.state,
      canonicalJson(rejectionCodes),
      canonicalJson(warningCodes),
      input.reviewerRef ?? null,
      input.reviewReason ?? null,
      previous?.id ?? null,
      input.policyVersion,
      input.decidedAt,
    );
  raw
    .prepare(
      `insert into description_decision_heads (candidate_id, decision_id)
       values (?, ?)
       on conflict(candidate_id) do update set decision_id = excluded.decision_id`,
    )
    .run(input.candidateId, id);
  return { id, changed: true };
};

const writeProjection = (
  raw: SqliteDatabase,
  input: {
    workId: string;
    candidateId: string | null;
    state: DescriptionProjectionState;
    reasonCode: string;
    actorRef: string;
    policyVersion: string;
    projectedAt: number;
  },
): { id: string; changed: boolean } => {
  const previous = currentProjection(raw, input.workId);
  if (
    previous?.candidateId === input.candidateId &&
    previous.state === input.state
  ) {
    return { id: previous.id, changed: false };
  }
  const id = descriptionProjectionIdentity({
    workId: input.workId,
    candidateId: input.candidateId,
    previousProjectionId: previous?.id ?? null,
    state: input.state,
    reasonCode: input.reasonCode,
    policyVersion: input.policyVersion,
  });
  raw
    .prepare(
      `insert into description_projections (
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
      input.policyVersion,
      input.projectedAt,
    );
  raw
    .prepare(
      `insert into description_projection_heads (work_id, projection_id)
       values (?, ?)
       on conflict(work_id) do update set projection_id = excluded.projection_id`,
    )
    .run(input.workId, id);
  return { id, changed: true };
};

const queueCandidate = (
  raw: SqliteDatabase,
  input: {
    candidateId: string;
    reasonCodes: readonly string[];
    capacity: number;
    now: number;
  },
): QueueOutcome => {
  const existing = raw
    .prepare(
      `select state from description_review_queue where candidate_id = ?`,
    )
    .get(input.candidateId) as { state: string } | undefined;
  if (existing?.state === "queued" || existing?.state === "claimed") {
    return "deduplicated";
  }
  const activeCount = Number(
    (
      raw
        .prepare(
          `select count(*) as count
           from description_review_queue
           where state in ('queued', 'claimed')`,
        )
        .get() as { count: number }
    ).count,
  );
  if (activeCount >= Math.max(0, Math.trunc(input.capacity))) {
    return "overflow_paused";
  }
  const reasons = uniqueSorted(input.reasonCodes);
  const priority = reasons.reduce(
    (total, reason) =>
      total +
      (reason.includes("sensitive") || reason.includes("ambiguous") ? 100 : 10),
    0,
  );
  raw
    .prepare(
      `insert into description_review_queue (
         candidate_id, state, priority, reason_codes_json, queued_at,
         updated_at, reviewer_ref
       ) values (?, 'queued', ?, ?, ?, ?, null)
       on conflict(candidate_id) do update set
         state = 'queued',
         priority = excluded.priority,
         reason_codes_json = excluded.reason_codes_json,
         queued_at = excluded.queued_at,
         updated_at = excluded.updated_at,
         reviewer_ref = null`,
    )
    .run(
      input.candidateId,
      priority,
      canonicalJson(reasons),
      input.now,
      input.now,
    );
  return "queued";
};

const persistedValidation = (
  candidate: CandidateRow,
  decision: DecisionRow,
): DescriptionValidationResult => ({
  rejectionCodes: parseJson<DescriptionRejectionCode[]>(
    decision.rejectionCodesJson,
  ),
  warningCodes: parseJson<DescriptionWarningCode[]>(decision.warningCodesJson),
  requiresHumanReview:
    decision.state === "review_required" || decision.state === "paused",
  wordCount: candidate.textContent.trim().split(/\s+/u).filter(Boolean).length,
  readabilityScore: 0,
  qualityScore: candidate.qualityScore ?? 0,
});

const existingCandidateResult = (
  raw: SqliteDatabase,
  candidateId: string,
): DescriptionCandidateResult | undefined => {
  const candidate = raw
    .prepare(
      `select
         id as "id",
         work_id as "workId",
         observation_id as "observationId",
         description_class as "descriptionClass",
         text_content as "textContent",
         text_hash as "textHash",
         source_revision as "sourceRevision",
         source_policy_version as "sourcePolicyVersion",
         description_policy_version as "descriptionPolicyVersion",
         editor_ref as "editorRef",
         model_id as "modelId",
         model_version as "modelVersion",
         prompt_version as "promptVersion",
         quality_score as "qualityScore"
       from description_candidates where id = ?`,
    )
    .get(candidateId) as CandidateRow | undefined;
  if (!candidate) return undefined;
  const decision = currentDecision(raw, candidateId);
  if (!decision) {
    throw new Error(
      `Description candidate ${candidateId} has no decision head`,
    );
  }
  const queueRow = raw
    .prepare(
      `select state from description_review_queue where candidate_id = ?`,
    )
    .get(candidateId) as { state: string } | undefined;
  return {
    candidateId,
    observationId: candidate.observationId,
    decisionId: decision.id,
    state: decision.state,
    validation: persistedValidation(candidate, decision),
    queue:
      decision.state === "paused"
        ? "overflow_paused"
        : queueRow?.state === "queued" || queueRow?.state === "claimed"
          ? "deduplicated"
          : "not_required",
    changed: false,
  };
};

export const createDescriptionCandidateSqlite = (
  raw: SqliteDatabase,
  input: {
    candidate: DescriptionCandidateInput;
    queueCapacity: number;
    failAfter?: "candidate" | "decision" | "projection";
  },
): DescriptionCandidateResult => {
  const candidateId = descriptionCandidateIdentity(input.candidate);
  const existing = existingCandidateResult(raw, candidateId);
  if (existing) return existing;
  const apply = raw.transaction(() => {
    const source = sourceContext(
      raw,
      input.candidate.sourceRecordId,
      input.candidate.workId,
    );
    const parentIds = input.candidate.claims.flatMap(
      (claim) => claim.parentObservationIds,
    );
    const parents = loadParents(raw, parentIds);
    const validation = validateDescriptionCandidate({
      candidate: input.candidate,
      parents,
    });
    if (source?.sourceRevision !== input.candidate.sourceRevision) {
      validation.rejectionCodes.push("source_revision_mismatch");
    }
    if (!sourceAllowsCandidate(source, input.candidate)) {
      validation.rejectionCodes.push("source_policy_ineligible");
    }
    if (
      input.candidate.descriptionClass === "licensed_verbatim" &&
      input.candidate.license.transformed &&
      source &&
      sourcePolicy(source.metadataPolicy).textPermission?.transform !== true
    ) {
      validation.rejectionCodes.push("licensed_derivative_not_permitted");
    }
    if (
      input.candidate.descriptionClass === "licensed_verbatim" &&
      source &&
      sourcePolicy(source.metadataPolicy).attribution?.required === true &&
      !input.candidate.license.attributionText?.trim()
    ) {
      validation.rejectionCodes.push("licensed_provenance_incomplete");
    }
    validation.rejectionCodes = uniqueSorted(validation.rejectionCodes);
    validation.warningCodes = uniqueSorted(validation.warningCodes);
    validation.requiresHumanReview =
      validation.rejectionCodes.length === 0 &&
      validation.warningCodes.length > 0;

    const observationId = descriptionObservationIdentity(candidateId);
    const generationInputHash = descriptionGenerationInputHash(input.candidate);
    raw
      .prepare(
        `insert into field_observations (
           id, source_record_id, entity_type, entity_id, field_key, value_json,
           comparison_hash, provenance_kind, source_path, source_modified_at,
           retrieved_at, mapping_confidence, state, actor_ref, reason,
           derivation_name, derivation_version, parent_ids_json
         ) values (
           ?, ?, 'work', ?, 'work.description', ?, ?, ?, ?, null, ?, 1, ?,
           ?, ?, ?, ?, ?
         )`,
      )
      .run(
        observationId,
        input.candidate.sourceRecordId,
        input.candidate.workId,
        canonicalJson(input.candidate.text),
        hashCanonicalJson(input.candidate.text),
        input.candidate.descriptionClass === "licensed_verbatim"
          ? "imported"
          : input.candidate.descriptionClass === "bukie_editorial"
            ? "curated"
            : "derived",
        input.candidate.descriptionClass === "licensed_verbatim"
          ? "licensed.description"
          : input.candidate.descriptionClass === "bukie_editorial"
            ? "editorial.description"
            : "model.description",
        input.candidate.createdAt,
        validation.rejectionCodes.length > 0 ? "invalid" : "active",
        input.candidate.descriptionClass === "bukie_editorial"
          ? input.candidate.editorial.editorRef
          : input.candidate.descriptionClass === "model_assisted_candidate"
            ? "system:description-generation-fixture"
            : null,
        input.candidate.descriptionClass === "bukie_editorial"
          ? input.candidate.editorial.reason
          : null,
        input.candidate.descriptionClass === "model_assisted_candidate"
          ? "provider-neutral-description-generation"
          : null,
        input.candidate.descriptionClass === "model_assisted_candidate"
          ? `${input.candidate.model.modelVersion}:${input.candidate.model.promptVersion}`
          : null,
        input.candidate.descriptionClass === "model_assisted_candidate"
          ? canonicalJson(uniqueSorted(parentIds))
          : null,
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
           generation_duration_ms, input_tokens, output_tokens, cost_microusd,
           quality_score, ambiguous_identity, sensitive_content, created_at
         ) values (
           ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?,
           ?, ?, ?, ?, ?, ?, ?, ?
         )`,
      )
      .run(
        candidateId,
        input.candidate.workId,
        observationId,
        input.candidate.descriptionClass,
        input.candidate.text,
        hashCanonicalJson(input.candidate.text),
        input.candidate.sourceRevision,
        input.candidate.sourcePolicyVersion,
        input.candidate.descriptionPolicyVersion,
        input.candidate.descriptionClass === "licensed_verbatim"
          ? input.candidate.license.name
          : null,
        input.candidate.descriptionClass === "licensed_verbatim"
          ? input.candidate.license.url
          : null,
        input.candidate.descriptionClass === "licensed_verbatim"
          ? input.candidate.license.attributionText
          : null,
        input.candidate.descriptionClass === "licensed_verbatim"
          ? Number(input.candidate.license.derivativesPermitted)
          : null,
        input.candidate.descriptionClass === "bukie_editorial"
          ? input.candidate.editorial.editorRef
          : null,
        input.candidate.descriptionClass === "bukie_editorial"
          ? input.candidate.editorial.reason
          : null,
        input.candidate.descriptionClass === "bukie_editorial"
          ? input.candidate.editorial.revision
          : null,
        input.candidate.descriptionClass === "model_assisted_candidate"
          ? input.candidate.model.modelId
          : null,
        input.candidate.descriptionClass === "model_assisted_candidate"
          ? input.candidate.model.modelVersion
          : null,
        input.candidate.descriptionClass === "model_assisted_candidate"
          ? input.candidate.model.promptVersion
          : null,
        input.candidate.descriptionClass === "model_assisted_candidate"
          ? generationInputHash
          : null,
        input.candidate.descriptionClass === "model_assisted_candidate"
          ? input.candidate.model.generatedAt
          : null,
        input.candidate.descriptionClass === "model_assisted_candidate"
          ? input.candidate.model.generationDurationMs
          : null,
        input.candidate.descriptionClass === "model_assisted_candidate"
          ? input.candidate.model.inputTokens
          : null,
        input.candidate.descriptionClass === "model_assisted_candidate"
          ? input.candidate.model.outputTokens
          : null,
        input.candidate.descriptionClass === "model_assisted_candidate"
          ? input.candidate.model.costMicrousd
          : null,
        validation.qualityScore,
        Number(input.candidate.ambiguousIdentity ?? false),
        Number(input.candidate.sensitiveContent ?? false),
        input.candidate.createdAt,
      );
    for (const [position, claim] of input.candidate.claims.entries()) {
      const claimHash = hashCanonicalJson(claim.text);
      const claimId = deterministicCatalogId(
        "description_claim",
        candidateId,
        hashCanonicalJson({ claimHash, position }),
      );
      raw
        .prepare(
          `insert into description_claims (
             id, candidate_id, position, claim_text, claim_hash
           ) values (?, ?, ?, ?, ?)`,
        )
        .run(claimId, candidateId, position, claim.text, claimHash);
      for (const parentId of uniqueSorted(claim.parentObservationIds)) {
        if (!parents.some((parent) => parent.id === parentId)) continue;
        raw
          .prepare(
            `insert into description_claim_evidence (claim_id, observation_id)
             values (?, ?)`,
          )
          .run(claimId, parentId);
      }
    }
    if (input.failAfter === "candidate") {
      throw new Error("Forced description failure after candidate");
    }

    let state: DescriptionDecisionState =
      validation.rejectionCodes.length > 0
        ? "rejected"
        : validation.requiresHumanReview
          ? "review_required"
          : "eligible";
    let queue: QueueOutcome = "not_required";
    if (state === "review_required") {
      queue = queueCandidate(raw, {
        candidateId,
        reasonCodes: validation.warningCodes,
        capacity: input.queueCapacity,
        now: input.candidate.createdAt,
      });
      if (queue === "overflow_paused") state = "paused";
    }
    const decision = writeDecision(raw, {
      candidateId,
      state,
      rejectionCodes: validation.rejectionCodes,
      warningCodes: validation.warningCodes,
      policyVersion: input.candidate.descriptionPolicyVersion,
      decidedAt: input.candidate.createdAt,
    });
    if (input.failAfter === "decision") {
      throw new Error("Forced description failure after decision");
    }
    if (state === "eligible") {
      writeProjection(raw, {
        workId: input.candidate.workId,
        candidateId,
        state: "selected",
        reasonCode: "automated_licensed_verbatim_eligible",
        actorRef: "system:description-gates",
        policyVersion: input.candidate.descriptionPolicyVersion,
        projectedAt: input.candidate.createdAt,
      });
    }
    if (input.failAfter === "projection") {
      throw new Error("Forced description failure after projection");
    }
    return {
      candidateId,
      observationId,
      decisionId: decision.id,
      state,
      validation,
      queue,
      changed: true,
    };
  });
  return apply.immediate();
};

export const retryDescriptionQueueSqlite = (
  raw: SqliteDatabase,
  input: {
    candidateId: string;
    queueCapacity: number;
    now: number;
  },
): QueueOutcome => {
  const apply = raw.transaction(() => {
    const decision = currentDecision(raw, input.candidateId);
    if (!decision) throw new Error("Description candidate decision not found");
    if (decision.state !== "paused" && decision.state !== "review_required") {
      return "not_required" as const;
    }
    const warningCodes = parseJson<DescriptionWarningCode[]>(
      decision.warningCodesJson,
    );
    const queue = queueCandidate(raw, {
      candidateId: input.candidateId,
      reasonCodes: warningCodes,
      capacity: input.queueCapacity,
      now: input.now,
    });
    if (queue !== "overflow_paused") {
      writeDecision(raw, {
        candidateId: input.candidateId,
        state: "review_required",
        rejectionCodes: parseJson(decision.rejectionCodesJson),
        warningCodes,
        policyVersion: decision.policyVersion,
        decidedAt: input.now,
      });
    }
    return queue;
  });
  return apply.immediate();
};

export const reviewDescriptionCandidateSqlite = (
  raw: SqliteDatabase,
  input: {
    candidateId: string;
    reviewerRef: string;
    decision: "approve" | "reject";
    reason: string;
    acknowledgedWarningCodes?: readonly DescriptionWarningCode[];
    reviewedAt: number;
    failAfter?: "decision" | "queue" | "projection";
  },
): { decisionId: string; state: "eligible" | "rejected"; changed: boolean } => {
  const apply = raw.transaction(() => {
    const candidate = raw
      .prepare(
        `select
           id as "id",
           work_id as "workId",
           observation_id as "observationId",
           description_class as "descriptionClass",
           text_content as "textContent",
           text_hash as "textHash",
           source_revision as "sourceRevision",
           source_policy_version as "sourcePolicyVersion",
           description_policy_version as "descriptionPolicyVersion",
           editor_ref as "editorRef",
           model_id as "modelId",
           model_version as "modelVersion",
           prompt_version as "promptVersion",
           quality_score as "qualityScore"
         from description_candidates where id = ?`,
      )
      .get(input.candidateId) as CandidateRow | undefined;
    if (!candidate) throw new Error("Description candidate not found");
    const current = currentDecision(raw, input.candidateId);
    if (!current) throw new Error("Description candidate decision not found");
    const finalState: "eligible" | "rejected" =
      input.decision === "approve" ? "eligible" : "rejected";
    if (
      current.state === finalState &&
      current.reviewerRef === input.reviewerRef &&
      current.reviewReason === input.reason
    ) {
      return { decisionId: current.id, state: finalState, changed: false };
    }
    if (current.state !== "review_required") {
      throw new Error(
        `Description review refused: candidate is ${current.state}`,
      );
    }
    if (
      candidate.descriptionClass === "bukie_editorial" &&
      candidate.editorRef === input.reviewerRef
    ) {
      throw new Error(
        "Description review refused: editorial reviewer must differ from editor",
      );
    }
    const warningCodes = parseJson<DescriptionWarningCode[]>(
      current.warningCodesJson,
    );
    if (input.decision === "approve") {
      const acknowledged = new Set(input.acknowledgedWarningCodes ?? []);
      const missing = warningCodes.filter((code) => !acknowledged.has(code));
      if (missing.length > 0) {
        throw new Error(
          `Description review refused: warnings not acknowledged: ${missing.join(",")}`,
        );
      }
    }
    const next = writeDecision(raw, {
      candidateId: input.candidateId,
      state: finalState,
      rejectionCodes:
        input.decision === "reject"
          ? uniqueSorted([
              ...parseJson<DescriptionRejectionCode[]>(
                current.rejectionCodesJson,
              ),
              "human_review_rejected",
            ])
          : [],
      warningCodes,
      reviewerRef: input.reviewerRef,
      reviewReason: input.reason,
      policyVersion: current.policyVersion,
      decidedAt: input.reviewedAt,
    });
    if (input.failAfter === "decision") {
      throw new Error("Forced description review failure after decision");
    }
    raw
      .prepare(
        `update description_review_queue
         set state = 'completed', updated_at = ?, reviewer_ref = ?
         where candidate_id = ?`,
      )
      .run(input.reviewedAt, input.reviewerRef, input.candidateId);
    if (input.failAfter === "queue") {
      throw new Error("Forced description review failure after queue");
    }
    if (finalState === "eligible") {
      writeProjection(raw, {
        workId: candidate.workId,
        candidateId: input.candidateId,
        state: "selected",
        reasonCode: "human_review_approved",
        actorRef: input.reviewerRef,
        policyVersion: current.policyVersion,
        projectedAt: input.reviewedAt,
      });
    }
    if (input.failAfter === "projection") {
      throw new Error("Forced description review failure after projection");
    }
    return { decisionId: next.id, state: finalState, changed: true };
  });
  return apply.immediate();
};

const removeProjectionIfSelected = (
  raw: SqliteDatabase,
  input: {
    candidate: CandidateRow;
    state: "withdrawn" | "invalidated";
    reasonCode: string;
    actorRef: string;
    policyVersion: string;
    at: number;
  },
): void => {
  const projection = currentProjection(raw, input.candidate.workId);
  if (projection?.candidateId !== input.candidate.id) return;
  writeProjection(raw, {
    workId: input.candidate.workId,
    candidateId: null,
    state: input.state,
    reasonCode: input.reasonCode,
    actorRef: input.actorRef,
    policyVersion: input.policyVersion,
    projectedAt: input.at,
  });
};

const candidateRow = (
  raw: SqliteDatabase,
  candidateId: string,
): CandidateRow | undefined =>
  raw
    .prepare(
      `select
         id as "id",
         work_id as "workId",
         observation_id as "observationId",
         description_class as "descriptionClass",
         text_content as "textContent",
         text_hash as "textHash",
         source_revision as "sourceRevision",
         source_policy_version as "sourcePolicyVersion",
         description_policy_version as "descriptionPolicyVersion",
         editor_ref as "editorRef",
         model_id as "modelId",
         model_version as "modelVersion",
         prompt_version as "promptVersion",
         quality_score as "qualityScore"
       from description_candidates where id = ?`,
    )
    .get(candidateId) as CandidateRow | undefined;

export const withdrawDescriptionCandidateSqlite = (
  raw: SqliteDatabase,
  input: {
    candidateId: string;
    actorRef: string;
    reason: string;
    withdrawnAt: number;
  },
): { changed: boolean; decisionId: string } => {
  const apply = raw.transaction(() => {
    const candidate = candidateRow(raw, input.candidateId);
    if (!candidate) throw new Error("Description candidate not found");
    const current = currentDecision(raw, input.candidateId);
    if (!current) throw new Error("Description candidate decision not found");
    if (current.state === "withdrawn") {
      return { changed: false, decisionId: current.id };
    }
    const next = writeDecision(raw, {
      candidateId: input.candidateId,
      state: "withdrawn",
      rejectionCodes: parseJson(current.rejectionCodesJson),
      warningCodes: parseJson(current.warningCodesJson),
      reviewerRef: input.actorRef,
      reviewReason: input.reason,
      policyVersion: current.policyVersion,
      decidedAt: input.withdrawnAt,
    });
    raw
      .prepare(`update field_observations set state = 'withdrawn' where id = ?`)
      .run(candidate.observationId);
    raw
      .prepare(
        `update description_review_queue
         set state = 'cancelled', updated_at = ?
         where candidate_id = ? and state in ('queued', 'claimed')`,
      )
      .run(input.withdrawnAt, input.candidateId);
    removeProjectionIfSelected(raw, {
      candidate,
      state: "withdrawn",
      reasonCode: "candidate_withdrawn",
      actorRef: input.actorRef,
      policyVersion: current.policyVersion,
      at: input.withdrawnAt,
    });
    return { changed: next.changed, decisionId: next.id };
  });
  return apply.immediate();
};

export const invalidateDescriptionCandidateSqlite = (
  raw: SqliteDatabase,
  input: {
    candidateId: string;
    actorRef?: string;
    reason: string;
    policyVersion: string;
    invalidatedAt: number;
  },
): { changed: boolean; decisionId: string } => {
  const apply = raw.transaction(() => {
    const candidate = candidateRow(raw, input.candidateId);
    if (!candidate) throw new Error("Description candidate not found");
    const current = currentDecision(raw, input.candidateId);
    if (!current) throw new Error("Description candidate decision not found");
    if (
      current.state === "invalidated" &&
      current.policyVersion === input.policyVersion
    ) {
      return { changed: false, decisionId: current.id };
    }
    const next = writeDecision(raw, {
      candidateId: input.candidateId,
      state: "invalidated",
      rejectionCodes: parseJson(current.rejectionCodesJson),
      warningCodes: parseJson(current.warningCodesJson),
      reviewerRef: input.actorRef ?? "system:description-policy",
      reviewReason: input.reason,
      policyVersion: input.policyVersion,
      decidedAt: input.invalidatedAt,
    });
    raw
      .prepare(
        `update description_review_queue
         set state = 'cancelled', updated_at = ?
         where candidate_id = ? and state in ('queued', 'claimed')`,
      )
      .run(input.invalidatedAt, input.candidateId);
    removeProjectionIfSelected(raw, {
      candidate,
      state: "invalidated",
      reasonCode: "candidate_policy_invalidated",
      actorRef: input.actorRef ?? "system:description-policy",
      policyVersion: input.policyVersion,
      at: input.invalidatedAt,
    });
    return { changed: next.changed, decisionId: next.id };
  });
  return apply.immediate();
};

export const requestDescriptionRereviewSqlite = (
  raw: SqliteDatabase,
  input: {
    candidateId: string;
    policyVersion: string;
    queueCapacity: number;
    requestedAt: number;
  },
): { state: "review_required" | "paused"; queue: QueueOutcome } => {
  const apply = raw.transaction(() => {
    const candidate = candidateRow(raw, input.candidateId);
    if (!candidate) throw new Error("Description candidate not found");
    const current = currentDecision(raw, input.candidateId);
    if (!current) throw new Error("Description candidate decision not found");
    const warningCodes = uniqueSorted([
      ...parseJson<DescriptionWarningCode[]>(current.warningCodesJson),
      "policy_version_review",
    ]);
    const queue = queueCandidate(raw, {
      candidateId: input.candidateId,
      reasonCodes: warningCodes,
      capacity: input.queueCapacity,
      now: input.requestedAt,
    });
    const state: "paused" | "review_required" =
      queue === "overflow_paused" ? "paused" : "review_required";
    writeDecision(raw, {
      candidateId: input.candidateId,
      state,
      rejectionCodes: [],
      warningCodes,
      policyVersion: input.policyVersion,
      decidedAt: input.requestedAt,
    });
    removeProjectionIfSelected(raw, {
      candidate,
      state: "invalidated",
      reasonCode: "candidate_rereview_required",
      actorRef: "system:description-policy",
      policyVersion: input.policyVersion,
      at: input.requestedAt,
    });
    return { state, queue };
  });
  return apply.immediate();
};

export const rollbackDescriptionProjectionSqlite = (
  raw: SqliteDatabase,
  input: {
    workId: string;
    targetProjectionId: string;
    actorRef: string;
    reason: string;
    policyVersion: string;
    rolledBackAt: number;
    failAfter?: "event" | "head";
  },
): { projectionId: string; changed: boolean } => {
  const apply = raw.transaction(() => {
    const target = raw
      .prepare(
        `select
           id as "id",
           candidate_id as "candidateId",
           state as "state"
         from description_projections
         where id = ? and work_id = ?`,
      )
      .get(input.targetProjectionId, input.workId) as ProjectionRow | undefined;
    if (
      !target?.candidateId ||
      (target.state !== "selected" && target.state !== "rolled_back")
    ) {
      throw new Error("Description rollback refused: target is not selectable");
    }
    const decision = currentDecision(raw, target.candidateId);
    if (decision?.state !== "eligible") {
      throw new Error(
        "Description rollback refused: target candidate is not eligible",
      );
    }
    const previous = currentProjection(raw, input.workId);
    const id = descriptionProjectionIdentity({
      workId: input.workId,
      candidateId: target.candidateId,
      previousProjectionId: previous?.id ?? null,
      state: "rolled_back",
      reasonCode: input.reason,
      policyVersion: input.policyVersion,
    });
    raw
      .prepare(
        `insert into description_projections (
           id, work_id, candidate_id, state, previous_projection_id,
           reason_code, actor_ref, policy_version, projected_at
         ) values (?, ?, ?, 'rolled_back', ?, ?, ?, ?, ?)`,
      )
      .run(
        id,
        input.workId,
        target.candidateId,
        previous?.id ?? null,
        input.reason,
        input.actorRef,
        input.policyVersion,
        input.rolledBackAt,
      );
    if (input.failAfter === "event") {
      throw new Error("Forced description rollback failure after event");
    }
    raw
      .prepare(
        `insert into description_projection_heads (work_id, projection_id)
         values (?, ?)
         on conflict(work_id) do update set projection_id = excluded.projection_id`,
      )
      .run(input.workId, id);
    if (input.failAfter === "head") {
      throw new Error("Forced description rollback failure after head");
    }
    return { projectionId: id, changed: previous?.id !== id };
  });
  return apply.immediate();
};

const candidateParentIds = (
  raw: SqliteDatabase,
  candidateId: string,
): string[] =>
  (
    raw
      .prepare(
        `select distinct e.observation_id as id
         from description_claims c
         join description_claim_evidence e on e.claim_id = c.id
         where c.candidate_id = ?
         order by e.observation_id`,
      )
      .all(candidateId) as Array<{ id: string }>
  ).map((row) => row.id);

export const getDescriptionProposalSqlite = (
  raw: SqliteDatabase,
  input: {
    workId: string;
    descriptionPolicyVersion: string;
    currentModelVersion?: string;
    currentPromptVersion?: string;
  },
):
  | {
      candidateId: string;
      text: string;
      descriptionClass: CandidateRow["descriptionClass"];
      qualityScore: number;
      publicDisplayEligible: false;
    }
  | undefined => {
  const projection = currentProjection(raw, input.workId);
  if (
    !projection?.candidateId ||
    (projection.state !== "selected" && projection.state !== "rolled_back")
  ) {
    return undefined;
  }
  const candidate = candidateRow(raw, projection.candidateId);
  const decision = currentDecision(raw, projection.candidateId);
  if (
    !candidate ||
    decision?.state !== "eligible" ||
    decision.policyVersion !== input.descriptionPolicyVersion
  ) {
    return undefined;
  }
  if (
    candidate.descriptionClass === "model_assisted_candidate" &&
    ((input.currentModelVersion &&
      candidate.modelVersion !== input.currentModelVersion) ||
      (input.currentPromptVersion &&
        candidate.promptVersion !== input.currentPromptVersion))
  ) {
    return undefined;
  }
  const observation = raw
    .prepare(
      `select source_record_id as "sourceRecordId", state
       from field_observations where id = ?`,
    )
    .get(candidate.observationId) as
    | { sourceRecordId: string; state: string }
    | undefined;
  if (!observation || observation.state !== "active") return undefined;
  const source = sourceContext(
    raw,
    observation.sourceRecordId,
    candidate.workId,
  );
  if (
    !candidateSourceIsCurrentlyUsable(source, candidate.sourcePolicyVersion)
  ) {
    return undefined;
  }
  const parents = loadParents(raw, candidateParentIds(raw, candidate.id));
  if (
    parents.some(
      (parent) =>
        !parent.eligible ||
        parent.unresolvedConflict ||
        parent.workId !== candidate.workId,
    )
  ) {
    return undefined;
  }
  return {
    candidateId: candidate.id,
    text: candidate.textContent,
    descriptionClass: candidate.descriptionClass,
    qualityScore: candidate.qualityScore ?? 0,
    publicDisplayEligible: false,
  };
};

export const reconcileDescriptionCandidateSqlite = (
  raw: SqliteDatabase,
  input: {
    candidateId: string;
    descriptionPolicyVersion: string;
    currentModelVersion?: string;
    currentPromptVersion?: string;
    queueCapacity: number;
    reconciledAt: number;
  },
):
  | "unchanged"
  | "withdrawn"
  | "invalidated_source_policy"
  | "invalidated_model"
  | "invalidated_prompt"
  | "rereview_required"
  | "rereview_paused" => {
  const candidate = candidateRow(raw, input.candidateId);
  if (!candidate) throw new Error("Description candidate not found");
  const observation = raw
    .prepare(
      `select source_record_id as "sourceRecordId", state
       from field_observations where id = ?`,
    )
    .get(candidate.observationId) as
    | { sourceRecordId: string; state: string }
    | undefined;
  const source = observation
    ? sourceContext(raw, observation.sourceRecordId, candidate.workId)
    : undefined;
  if (
    observation?.state === "withdrawn" ||
    source?.sourceRecordState === "withdrawn" ||
    source?.sourceRecordState === "deleted"
  ) {
    withdrawDescriptionCandidateSqlite(raw, {
      candidateId: candidate.id,
      actorRef: "system:description-reconciliation",
      reason: "source_withdrawn",
      withdrawnAt: input.reconciledAt,
    });
    return "withdrawn";
  }
  const parents = loadParents(raw, candidateParentIds(raw, candidate.id));
  if (
    !candidateSourceIsCurrentlyUsable(source, candidate.sourcePolicyVersion) ||
    parents.some(
      (parent) =>
        !parent.eligible ||
        parent.unresolvedConflict ||
        parent.workId !== candidate.workId,
    )
  ) {
    invalidateDescriptionCandidateSqlite(raw, {
      candidateId: candidate.id,
      reason: "source_or_parent_policy_revoked",
      policyVersion: input.descriptionPolicyVersion,
      invalidatedAt: input.reconciledAt,
    });
    return "invalidated_source_policy";
  }
  if (
    candidate.descriptionClass === "model_assisted_candidate" &&
    input.currentModelVersion &&
    candidate.modelVersion !== input.currentModelVersion
  ) {
    invalidateDescriptionCandidateSqlite(raw, {
      candidateId: candidate.id,
      reason: "model_version_invalidated",
      policyVersion: input.descriptionPolicyVersion,
      invalidatedAt: input.reconciledAt,
    });
    return "invalidated_model";
  }
  if (
    candidate.descriptionClass === "model_assisted_candidate" &&
    input.currentPromptVersion &&
    candidate.promptVersion !== input.currentPromptVersion
  ) {
    invalidateDescriptionCandidateSqlite(raw, {
      candidateId: candidate.id,
      reason: "prompt_version_invalidated",
      policyVersion: input.descriptionPolicyVersion,
      invalidatedAt: input.reconciledAt,
    });
    return "invalidated_prompt";
  }
  const decision = currentDecision(raw, candidate.id);
  if (decision?.policyVersion !== input.descriptionPolicyVersion) {
    const rereview = requestDescriptionRereviewSqlite(raw, {
      candidateId: candidate.id,
      policyVersion: input.descriptionPolicyVersion,
      queueCapacity: input.queueCapacity,
      requestedAt: input.reconciledAt,
    });
    return rereview.state === "paused"
      ? "rereview_paused"
      : "rereview_required";
  }
  return "unchanged";
};

const scaled = (value: number, scopeWorks: number): number =>
  scopeWorks <= 0 ? 0 : Math.round((value * 500) / scopeWorks);

export const descriptionMetricsSqlite = (
  raw: SqliteDatabase,
  scopeWorks: number,
): DescriptionMetrics => {
  const counts = raw
    .prepare(
      `select
         count(*) as candidates,
         count(distinct c.work_id) as candidateWorks,
         sum(case when d.state = 'rejected' then 1 else 0 end) as rejected,
         sum(case when d.reviewer_ref is not null then 1 else 0 end) as reviewed,
         sum(case when d.state = 'eligible' then 1 else 0 end) as eligible,
         count(distinct case when d.state = 'eligible' then c.work_id end) as eligibleWorks,
         sum(case when d.state = 'withdrawn' then 1 else 0 end) as withdrawn,
         sum(case when d.state = 'invalidated' then 1 else 0 end) as invalidated,
         sum(case when d.state = 'paused' then 1 else 0 end) as paused,
         coalesce(sum(c.input_tokens), 0) as inputTokens,
         coalesce(sum(c.output_tokens), 0) as outputTokens,
         coalesce(sum(c.cost_microusd), 0) as costMicrousd
       from description_candidates c
       join description_decision_heads h on h.candidate_id = c.id
       join description_decisions d on d.id = h.decision_id`,
    )
    .get() as Record<string, number | null>;
  const queueRows = raw
    .prepare(
      `select state, count(*) as count
       from description_review_queue group by state`,
    )
    .all() as Array<{
    state: keyof DescriptionMetrics["queue"];
    count: number;
  }>;
  const queue = {
    queued: 0,
    claimed: 0,
    completed: 0,
    cancelled: 0,
  };
  for (const row of queueRows) queue[row.state] = Number(row.count);
  const classRows = raw
    .prepare(
      `select description_class as class, count(*) as count
       from description_candidates group by description_class`,
    )
    .all() as Array<{
    class: keyof DescriptionMetrics["byClass"];
    count: number;
  }>;
  const byClass = {
    licensed_verbatim: 0,
    bukie_editorial: 0,
    model_assisted_candidate: 0,
  };
  for (const row of classRows) byClass[row.class] = Number(row.count);
  const candidates = Number(counts.candidates ?? 0);
  const eligible = Number(counts.eligible ?? 0);
  const candidateWorks = Number(counts.candidateWorks ?? 0);
  const eligibleWorks = Number(counts.eligibleWorks ?? 0);
  const inputTokens = Number(counts.inputTokens ?? 0);
  const outputTokens = Number(counts.outputTokens ?? 0);
  const costMicrousd = Number(counts.costMicrousd ?? 0);
  return {
    scopeWorks,
    candidates,
    rejected: Number(counts.rejected ?? 0),
    reviewed: Number(counts.reviewed ?? 0),
    eligible,
    withdrawn: Number(counts.withdrawn ?? 0),
    invalidated: Number(counts.invalidated ?? 0),
    paused: Number(counts.paused ?? 0),
    queue,
    coverage: {
      candidateWorks,
      eligibleWorks,
      candidateBasisPoints:
        scopeWorks <= 0
          ? 0
          : Math.round((candidateWorks * 10_000) / scopeWorks),
      eligibleBasisPoints:
        scopeWorks <= 0 ? 0 : Math.round((eligibleWorks * 10_000) / scopeWorks),
    },
    tokens: {
      input: inputTokens,
      output: outputTokens,
      total: inputTokens + outputTokens,
    },
    costMicrousd,
    estimate500: {
      candidates: scaled(candidates, scopeWorks),
      eligible: scaled(eligible, scopeWorks),
      inputTokens: scaled(inputTokens, scopeWorks),
      outputTokens: scaled(outputTokens, scopeWorks),
      costMicrousd: scaled(costMicrousd, scopeWorks),
    },
    byClass,
  };
};

export const DESCRIPTION_PUBLIC_PROJECTION_TABLES = [] as const;
