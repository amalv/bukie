import postgres from "postgres";
import { deterministicCatalogId, hashCanonicalJson } from "../../identity";
import { sourcePolicyAllowsFieldDisplay } from "../../policy-eligibility";
import type { DescriptionDecisionState } from "../../values";
import {
  descriptionCandidateIdentity,
  descriptionDecisionIdentity,
  descriptionObservationIdentity,
  descriptionProjectionIdentity,
} from "./repository";
import type {
  DescriptionCandidateInput,
  DescriptionCandidateResult,
  DescriptionMetrics,
  DescriptionParentEvidence,
  DescriptionRejectionCode,
  DescriptionWarningCode,
} from "./types";
import {
  descriptionGenerationInputHash,
  validateDescriptionCandidate,
} from "./validation";

type SourceRow = {
  sourceRevision: string | null;
  sourceRecordState: string;
  sourceApproval: string;
  metadataPolicy: unknown;
  sourceLinkState: string | null;
};

type ParentRow = {
  id: string;
  entityType: string;
  entityId: string;
  workId: string | null;
  fieldKey: string;
  valueJson: unknown;
  observationState: string;
  provenanceKind: string;
  sourceRecordState: string;
  sourceApproval: string;
  sourceLinkState: string | null;
  metadataPolicy: unknown;
  resolutionState: string | null;
};

type DecisionRow = {
  id: string;
  state: DescriptionDecisionState;
  rejectionCodes: DescriptionRejectionCode[];
  warningCodes: DescriptionWarningCode[];
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
  editorRef: string | null;
  modelVersion: string | null;
  promptVersion: string | null;
  qualityScore: number | null;
};

const uniqueSorted = <T extends string>(values: readonly T[]): T[] =>
  [...new Set(values)].sort();

const jsonStringArray = <T extends string>(value: unknown): T[] => {
  if (Array.isArray(value)) return value as T[];
  if (typeof value !== "string") return [];
  try {
    const parsed: unknown = JSON.parse(value);
    return Array.isArray(parsed) ? (parsed as T[]) : [];
  } catch {
    return [];
  }
};

const policyObject = (
  value: unknown,
): {
  sourcePolicyVersion?: unknown;
  textPermission?: {
    allowedFields?: unknown;
    fetch?: unknown;
    transform?: unknown;
  };
  attribution?: {
    required?: unknown;
  };
} => {
  if (typeof value === "string") {
    try {
      return policyObject(JSON.parse(value));
    } catch {
      return {};
    }
  }
  return value && typeof value === "object" && !Array.isArray(value)
    ? value
    : {};
};

const sourceAllowsCandidate = (
  source: SourceRow | undefined,
  candidate: DescriptionCandidateInput,
): boolean => {
  if (
    !source ||
    source.sourceApproval !== "approved" ||
    source.sourceRecordState !== "active" ||
    source.sourceLinkState !== "active"
  ) {
    return false;
  }
  const policy = policyObject(source.metadataPolicy);
  return Boolean(
    policy.sourcePolicyVersion === candidate.sourcePolicyVersion &&
      policy.textPermission?.fetch === true &&
      Array.isArray(policy.textPermission.allowedFields) &&
      policy.textPermission.allowedFields.includes("work.description"),
  );
};

const parentEvidence = (
  rows: readonly ParentRow[],
): DescriptionParentEvidence[] =>
  rows.map((row) => ({
    id: row.id,
    entityType: row.entityType,
    entityId: row.entityId,
    workId: row.workId,
    fieldKey: row.fieldKey,
    value: row.valueJson,
    sourceText: typeof row.valueJson === "string" ? row.valueJson : null,
    eligible:
      (row.observationState === "active" || row.observationState === "stale") &&
      row.provenanceKind !== "synthetic" &&
      row.sourceRecordState === "active" &&
      row.sourceApproval === "approved" &&
      row.sourceLinkState === "active" &&
      sourcePolicyAllowsFieldDisplay(
        row.metadataPolicy as Record<string, unknown>,
        row.fieldKey,
      ),
    unresolvedConflict: row.resolutionState === "conflicting",
  }));

const decisionFromRow = (row: Record<string, unknown>): DecisionRow => ({
  id: String(row.id),
  state: row.state as DescriptionDecisionState,
  rejectionCodes: jsonStringArray<DescriptionRejectionCode>(row.rejectionCodes),
  warningCodes: jsonStringArray<DescriptionWarningCode>(row.warningCodes),
  reviewerRef: row.reviewerRef ? String(row.reviewerRef) : null,
  reviewReason: row.reviewReason ? String(row.reviewReason) : null,
  policyVersion: String(row.policyVersion),
});

const candidateFromRow = (row: Record<string, unknown>): CandidateRow => ({
  id: String(row.id),
  workId: String(row.workId),
  observationId: String(row.observationId),
  descriptionClass: row.descriptionClass as CandidateRow["descriptionClass"],
  textContent: String(row.textContent),
  editorRef: row.editorRef ? String(row.editorRef) : null,
  modelVersion: row.modelVersion ? String(row.modelVersion) : null,
  promptVersion: row.promptVersion ? String(row.promptVersion) : null,
  qualityScore:
    row.qualityScore === null || row.qualityScore === undefined
      ? null
      : Number(row.qualityScore),
});

export const createDescriptionCandidatePostgres = async (input: {
  url: string;
  candidate: DescriptionCandidateInput;
  queueCapacity: number;
  failAfter?: "candidate" | "decision" | "projection";
}): Promise<DescriptionCandidateResult> => {
  const client = postgres(input.url, { max: 1 });
  const candidateId = descriptionCandidateIdentity(input.candidate);
  try {
    return await client.begin(async (sql) => {
      const existingRows = await sql.unsafe(
        `select
           c.observation_id as "observationId",
           c.text_content as "textContent",
           c.quality_score as "qualityScore",
           d.id as "decisionId",
           d.state as "state",
           d.rejection_codes_json as "rejectionCodes",
           d.warning_codes_json as "warningCodes",
           q.state as "queueState"
         from description_candidates c
         join description_decision_heads h on h.candidate_id = c.id
         join description_decisions d on d.id = h.decision_id
         left join description_review_queue q on q.candidate_id = c.id
         where c.id = $1`,
        [candidateId],
      );
      if (existingRows[0]) {
        const row = existingRows[0] as Record<string, unknown>;
        const state = row.state as DescriptionDecisionState;
        return {
          candidateId,
          observationId: String(row.observationId),
          decisionId: String(row.decisionId),
          state,
          validation: {
            rejectionCodes: jsonStringArray<DescriptionRejectionCode>(
              row.rejectionCodes,
            ),
            warningCodes: jsonStringArray<DescriptionWarningCode>(
              row.warningCodes,
            ),
            requiresHumanReview:
              state === "review_required" || state === "paused",
            wordCount: String(row.textContent)
              .trim()
              .split(/\s+/u)
              .filter(Boolean).length,
            readabilityScore: 0,
            qualityScore: Number(row.qualityScore ?? 0),
          },
          queue:
            state === "paused"
              ? "overflow_paused"
              : row.queueState === "queued" || row.queueState === "claimed"
                ? "deduplicated"
                : "not_required",
          changed: false,
        };
      }

      const sourceRows = await sql.unsafe(
        `select
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
          and sl.entity_id = $1
         where sr.id = $2`,
        [input.candidate.workId, input.candidate.sourceRecordId],
      );
      const source = sourceRows[0] as unknown as SourceRow | undefined;
      const parentIds = uniqueSorted(
        input.candidate.claims.flatMap((claim) => claim.parentObservationIds),
      );
      const parentRows =
        parentIds.length === 0
          ? []
          : await sql.unsafe(
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
               where o.id = any($1::text[])
               order by o.id`,
              [parentIds],
            );
      const loadedParentIds = new Set(
        (parentRows as unknown as ParentRow[]).map((row) => row.id),
      );
      const validation = validateDescriptionCandidate({
        candidate: input.candidate,
        parents: parentEvidence(parentRows as unknown as ParentRow[]),
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
        policyObject(source?.metadataPolicy).textPermission?.transform !== true
      ) {
        validation.rejectionCodes.push("licensed_derivative_not_permitted");
      }
      if (
        input.candidate.descriptionClass === "licensed_verbatim" &&
        policyObject(source?.metadataPolicy).attribution?.required === true &&
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
      await sql.unsafe(
        `insert into field_observations (
           id, source_record_id, entity_type, entity_id, field_key, value_json,
           comparison_hash, provenance_kind, source_path, source_modified_at,
           retrieved_at, mapping_confidence, state, actor_ref, reason,
           derivation_name, derivation_version, parent_ids_json
         ) values (
           $1, $2, 'work', $3, 'work.description', $4::jsonb, $5, $6, $7,
           null, $8, 1, $9, $10, $11, $12, $13, $14::jsonb
         )`,
        [
          observationId,
          input.candidate.sourceRecordId,
          input.candidate.workId,
          JSON.stringify(input.candidate.text),
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
            ? JSON.stringify(parentIds)
            : null,
        ],
      );
      await sql.unsafe(
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
           $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14,
           $15, $16, $17, $18, $19, $20, $21, $22, $23, $24, $25, $26,
           $27, $28, $29
         )`,
        [
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
            ? input.candidate.license.derivativesPermitted
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
            ? descriptionGenerationInputHash(input.candidate)
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
          input.candidate.ambiguousIdentity ?? false,
          input.candidate.sensitiveContent ?? false,
          input.candidate.createdAt,
        ],
      );
      for (const [position, claim] of input.candidate.claims.entries()) {
        const claimHash = hashCanonicalJson(claim.text);
        const claimId = deterministicCatalogId(
          "description_claim",
          candidateId,
          hashCanonicalJson({ claimHash, position }),
        );
        await sql.unsafe(
          `insert into description_claims (
             id, candidate_id, position, claim_text, claim_hash
           ) values ($1, $2, $3, $4, $5)`,
          [claimId, candidateId, position, claim.text, claimHash],
        );
        for (const parentId of uniqueSorted(claim.parentObservationIds)) {
          if (!loadedParentIds.has(parentId)) continue;
          await sql.unsafe(
            `insert into description_claim_evidence (claim_id, observation_id)
             values ($1, $2)`,
            [claimId, parentId],
          );
        }
      }
      if (input.failAfter === "candidate") {
        throw new Error("Forced Postgres description failure after candidate");
      }

      let state: DescriptionDecisionState =
        validation.rejectionCodes.length > 0
          ? "rejected"
          : validation.requiresHumanReview
            ? "review_required"
            : "eligible";
      let queue: DescriptionCandidateResult["queue"] = "not_required";
      if (state === "review_required") {
        await sql.unsafe("select pg_advisory_xact_lock(133)");
        const countRows = await sql.unsafe(
          `select count(*)::int as count
           from description_review_queue
           where state in ('queued', 'claimed')`,
        );
        if (
          Number(countRows[0]?.count ?? 0) >=
          Math.max(0, Math.trunc(input.queueCapacity))
        ) {
          state = "paused";
          queue = "overflow_paused";
        } else {
          const priority = validation.warningCodes.reduce(
            (total, code) =>
              total +
              (code.includes("sensitive") || code.includes("ambiguous")
                ? 100
                : 10),
            0,
          );
          await sql.unsafe(
            `insert into description_review_queue (
               candidate_id, state, priority, reason_codes_json, queued_at,
               updated_at, reviewer_ref
             ) values ($1, 'queued', $2, $3::jsonb, $4, $4, null)`,
            [
              candidateId,
              priority,
              JSON.stringify(validation.warningCodes),
              input.candidate.createdAt,
            ],
          );
          queue = "queued";
        }
      }
      const decisionId = descriptionDecisionIdentity({
        candidateId,
        previousDecisionId: null,
        state,
        rejectionCodes: validation.rejectionCodes,
        warningCodes: validation.warningCodes,
        reviewerRef: null,
        reviewReason: null,
        policyVersion: input.candidate.descriptionPolicyVersion,
      });
      await sql.unsafe(
        `insert into description_decisions (
           id, candidate_id, state, rejection_codes_json, warning_codes_json,
           reviewer_ref, review_reason, previous_decision_id, policy_version,
           decided_at
         ) values ($1, $2, $3, $4::jsonb, $5::jsonb, null, null, null, $6, $7)`,
        [
          decisionId,
          candidateId,
          state,
          JSON.stringify(validation.rejectionCodes),
          JSON.stringify(validation.warningCodes),
          input.candidate.descriptionPolicyVersion,
          input.candidate.createdAt,
        ],
      );
      await sql.unsafe(
        `insert into description_decision_heads (candidate_id, decision_id)
         values ($1, $2)`,
        [candidateId, decisionId],
      );
      if (input.failAfter === "decision") {
        throw new Error("Forced Postgres description failure after decision");
      }
      if (state === "eligible") {
        const currentProjectionRows = await sql.unsafe(
          `select p.id as id
           from description_projection_heads h
           join description_projections p on p.id = h.projection_id
           where h.work_id = $1`,
          [input.candidate.workId],
        );
        const previousProjectionId = currentProjectionRows[0]
          ? String(currentProjectionRows[0].id)
          : null;
        const projectionId = descriptionProjectionIdentity({
          workId: input.candidate.workId,
          candidateId,
          previousProjectionId,
          state: "selected",
          reasonCode: "automated_licensed_verbatim_eligible",
          policyVersion: input.candidate.descriptionPolicyVersion,
        });
        await sql.unsafe(
          `insert into description_projections (
             id, work_id, candidate_id, state, previous_projection_id,
             reason_code, actor_ref, policy_version, projected_at
           ) values ($1, $2, $3, 'selected', $4, $5, $6, $7, $8)`,
          [
            projectionId,
            input.candidate.workId,
            candidateId,
            previousProjectionId,
            "automated_licensed_verbatim_eligible",
            "system:description-gates",
            input.candidate.descriptionPolicyVersion,
            input.candidate.createdAt,
          ],
        );
        await sql.unsafe(
          `insert into description_projection_heads (work_id, projection_id)
           values ($1, $2)
           on conflict(work_id)
           do update set projection_id = excluded.projection_id`,
          [input.candidate.workId, projectionId],
        );
      }
      if (input.failAfter === "projection") {
        throw new Error("Forced Postgres description failure after projection");
      }
      return {
        candidateId,
        observationId,
        decisionId,
        state,
        validation,
        queue,
        changed: true,
      };
    });
  } finally {
    await client.end({ timeout: 5_000 });
  }
};

export const reviewDescriptionCandidatePostgres = async (input: {
  url: string;
  candidateId: string;
  reviewerRef: string;
  decision: "approve" | "reject";
  reason: string;
  acknowledgedWarningCodes?: readonly DescriptionWarningCode[];
  reviewedAt: number;
  failAfter?: "decision" | "queue" | "projection";
}): Promise<{
  decisionId: string;
  state: "eligible" | "rejected";
  changed: boolean;
}> => {
  const client = postgres(input.url, { max: 1 });
  try {
    return await client.begin(async (sql) => {
      const rows = await sql.unsafe(
        `select
           c.id as "id",
           c.work_id as "workId",
           c.observation_id as "observationId",
           c.description_class as "descriptionClass",
           c.text_content as "textContent",
           c.editor_ref as "editorRef",
           c.model_version as "modelVersion",
           c.prompt_version as "promptVersion",
           c.quality_score as "qualityScore",
           d.id as "decisionId",
           d.state as "state",
           d.rejection_codes_json as "rejectionCodes",
           d.warning_codes_json as "warningCodes",
           d.reviewer_ref as "reviewerRef",
           d.review_reason as "reviewReason",
           d.policy_version as "policyVersion"
         from description_candidates c
         join description_decision_heads h on h.candidate_id = c.id
         join description_decisions d on d.id = h.decision_id
         where c.id = $1
         for update of c, h`,
        [input.candidateId],
      );
      if (!rows[0]) throw new Error("Description candidate not found");
      const candidate = candidateFromRow(rows[0] as Record<string, unknown>);
      const current = decisionFromRow({
        ...(rows[0] as Record<string, unknown>),
        id: rows[0].decisionId,
      });
      const state: "eligible" | "rejected" =
        input.decision === "approve" ? "eligible" : "rejected";
      if (
        current.state === state &&
        current.reviewerRef === input.reviewerRef &&
        current.reviewReason === input.reason
      ) {
        return { decisionId: current.id, state, changed: false };
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
      if (input.decision === "approve") {
        const acknowledged = new Set(input.acknowledgedWarningCodes ?? []);
        const missing = current.warningCodes.filter(
          (code) => !acknowledged.has(code),
        );
        if (missing.length > 0) {
          throw new Error(
            `Description review refused: warnings not acknowledged: ${missing.join(",")}`,
          );
        }
      }
      const rejectionCodes =
        input.decision === "reject"
          ? uniqueSorted([
              ...current.rejectionCodes,
              "human_review_rejected" as const,
            ])
          : [];
      const decisionId = descriptionDecisionIdentity({
        candidateId: input.candidateId,
        previousDecisionId: current.id,
        state,
        rejectionCodes,
        warningCodes: current.warningCodes,
        reviewerRef: input.reviewerRef,
        reviewReason: input.reason,
        policyVersion: current.policyVersion,
      });
      await sql.unsafe(
        `insert into description_decisions (
           id, candidate_id, state, rejection_codes_json, warning_codes_json,
           reviewer_ref, review_reason, previous_decision_id, policy_version,
           decided_at
         ) values ($1, $2, $3, $4::jsonb, $5::jsonb, $6, $7, $8, $9, $10)`,
        [
          decisionId,
          input.candidateId,
          state,
          JSON.stringify(rejectionCodes),
          JSON.stringify(current.warningCodes),
          input.reviewerRef,
          input.reason,
          current.id,
          current.policyVersion,
          input.reviewedAt,
        ],
      );
      await sql.unsafe(
        `update description_decision_heads set decision_id = $1
         where candidate_id = $2`,
        [decisionId, input.candidateId],
      );
      if (input.failAfter === "decision") {
        throw new Error("Forced Postgres description review after decision");
      }
      await sql.unsafe(
        `update description_review_queue
         set state = 'completed', updated_at = $1, reviewer_ref = $2
         where candidate_id = $3`,
        [input.reviewedAt, input.reviewerRef, input.candidateId],
      );
      if (input.failAfter === "queue") {
        throw new Error("Forced Postgres description review after queue");
      }
      if (state === "eligible") {
        const currentProjectionRows = await sql.unsafe(
          `select p.id as id
           from description_projection_heads h
           join description_projections p on p.id = h.projection_id
           where h.work_id = $1`,
          [candidate.workId],
        );
        const previousProjectionId = currentProjectionRows[0]
          ? String(currentProjectionRows[0].id)
          : null;
        const projectionId = descriptionProjectionIdentity({
          workId: candidate.workId,
          candidateId: candidate.id,
          previousProjectionId,
          state: "selected",
          reasonCode: "human_review_approved",
          policyVersion: current.policyVersion,
        });
        await sql.unsafe(
          `insert into description_projections (
             id, work_id, candidate_id, state, previous_projection_id,
             reason_code, actor_ref, policy_version, projected_at
           ) values ($1, $2, $3, 'selected', $4, $5, $6, $7, $8)`,
          [
            projectionId,
            candidate.workId,
            candidate.id,
            previousProjectionId,
            "human_review_approved",
            input.reviewerRef,
            current.policyVersion,
            input.reviewedAt,
          ],
        );
        await sql.unsafe(
          `insert into description_projection_heads (work_id, projection_id)
           values ($1, $2)
           on conflict(work_id)
           do update set projection_id = excluded.projection_id`,
          [candidate.workId, projectionId],
        );
      }
      if (input.failAfter === "projection") {
        throw new Error("Forced Postgres description review after projection");
      }
      return { decisionId, state, changed: true };
    });
  } finally {
    await client.end({ timeout: 5_000 });
  }
};

export const transitionDescriptionCandidatePostgres = async (input: {
  url: string;
  candidateId: string;
  state: "withdrawn" | "invalidated";
  actorRef: string;
  reason: string;
  policyVersion: string;
  at: number;
}): Promise<{ decisionId: string; changed: boolean }> => {
  const client = postgres(input.url, { max: 1 });
  try {
    return await client.begin(async (sql) => {
      const rows = await sql.unsafe(
        `select
           c.id as "id",
           c.work_id as "workId",
           c.observation_id as "observationId",
           d.id as "decisionId",
           d.state as "state",
           d.rejection_codes_json as "rejectionCodes",
           d.warning_codes_json as "warningCodes",
           d.reviewer_ref as "reviewerRef",
           d.review_reason as "reviewReason",
           d.policy_version as "policyVersion"
         from description_candidates c
         join description_decision_heads h on h.candidate_id = c.id
         join description_decisions d on d.id = h.decision_id
         where c.id = $1
         for update of c, h`,
        [input.candidateId],
      );
      if (!rows[0]) throw new Error("Description candidate not found");
      const row = rows[0] as Record<string, unknown>;
      const current = decisionFromRow({
        ...row,
        id: row.decisionId,
      });
      if (
        current.state === input.state &&
        current.policyVersion === input.policyVersion
      ) {
        return { decisionId: current.id, changed: false };
      }
      const decisionId = descriptionDecisionIdentity({
        candidateId: input.candidateId,
        previousDecisionId: current.id,
        state: input.state,
        rejectionCodes: current.rejectionCodes,
        warningCodes: current.warningCodes,
        reviewerRef: input.actorRef,
        reviewReason: input.reason,
        policyVersion: input.policyVersion,
      });
      await sql.unsafe(
        `insert into description_decisions (
           id, candidate_id, state, rejection_codes_json, warning_codes_json,
           reviewer_ref, review_reason, previous_decision_id, policy_version,
           decided_at
         ) values ($1, $2, $3, $4::jsonb, $5::jsonb, $6, $7, $8, $9, $10)`,
        [
          decisionId,
          input.candidateId,
          input.state,
          JSON.stringify(current.rejectionCodes),
          JSON.stringify(current.warningCodes),
          input.actorRef,
          input.reason,
          current.id,
          input.policyVersion,
          input.at,
        ],
      );
      await sql.unsafe(
        `update description_decision_heads set decision_id = $1
         where candidate_id = $2`,
        [decisionId, input.candidateId],
      );
      if (input.state === "withdrawn") {
        await sql.unsafe(
          "update field_observations set state = 'withdrawn' where id = $1",
          [String(row.observationId)],
        );
      }
      await sql.unsafe(
        `update description_review_queue
         set state = 'cancelled', updated_at = $1
         where candidate_id = $2 and state in ('queued', 'claimed')`,
        [input.at, input.candidateId],
      );
      const projectionRows = await sql.unsafe(
        `select p.id as id, p.candidate_id as "candidateId"
         from description_projection_heads h
         join description_projections p on p.id = h.projection_id
         where h.work_id = $1`,
        [String(row.workId)],
      );
      if (projectionRows[0]?.candidateId === input.candidateId) {
        const projectionId = descriptionProjectionIdentity({
          workId: String(row.workId),
          candidateId: null,
          previousProjectionId: String(projectionRows[0].id),
          state: input.state,
          reasonCode: input.reason,
          policyVersion: input.policyVersion,
        });
        await sql.unsafe(
          `insert into description_projections (
             id, work_id, candidate_id, state, previous_projection_id,
             reason_code, actor_ref, policy_version, projected_at
           ) values ($1, $2, null, $3, $4, $5, $6, $7, $8)`,
          [
            projectionId,
            String(row.workId),
            input.state,
            projectionRows[0].id,
            input.reason,
            input.actorRef,
            input.policyVersion,
            input.at,
          ],
        );
        await sql.unsafe(
          `update description_projection_heads set projection_id = $1
           where work_id = $2`,
          [projectionId, String(row.workId)],
        );
      }
      return { decisionId, changed: true };
    });
  } finally {
    await client.end({ timeout: 5_000 });
  }
};

const scaled = (value: number, scopeWorks: number): number =>
  scopeWorks <= 0 ? 0 : Math.round((value * 500) / scopeWorks);

export const descriptionMetricsPostgres = async (input: {
  url: string;
  scopeWorks: number;
}): Promise<DescriptionMetrics> => {
  const client = postgres(input.url, { max: 1 });
  try {
    const [countsRows, queueRows, classRows] = await Promise.all([
      client.unsafe(
        `select
           count(*)::int as candidates,
           count(distinct c.work_id)::int as "candidateWorks",
           count(*) filter (where d.state = 'rejected')::int as rejected,
           count(*) filter (where d.reviewer_ref is not null)::int as reviewed,
           count(*) filter (where d.state = 'eligible')::int as eligible,
           count(distinct c.work_id) filter (where d.state = 'eligible')::int as "eligibleWorks",
           count(*) filter (where d.state = 'withdrawn')::int as withdrawn,
           count(*) filter (where d.state = 'invalidated')::int as invalidated,
           count(*) filter (where d.state = 'paused')::int as paused,
           coalesce(sum(c.input_tokens), 0)::bigint as "inputTokens",
           coalesce(sum(c.output_tokens), 0)::bigint as "outputTokens",
           coalesce(sum(c.cost_microusd), 0)::bigint as "costMicrousd"
         from description_candidates c
         join description_decision_heads h on h.candidate_id = c.id
         join description_decisions d on d.id = h.decision_id`,
      ),
      client.unsafe(
        `select state, count(*)::int as count
         from description_review_queue group by state`,
      ),
      client.unsafe(
        `select description_class as class, count(*)::int as count
         from description_candidates group by description_class`,
      ),
    ]);
    const counts = countsRows[0] as Record<string, unknown>;
    const queue = {
      queued: 0,
      claimed: 0,
      completed: 0,
      cancelled: 0,
    };
    for (const row of queueRows) {
      queue[row.state as keyof typeof queue] = Number(row.count);
    }
    const byClass = {
      licensed_verbatim: 0,
      bukie_editorial: 0,
      model_assisted_candidate: 0,
    };
    for (const row of classRows) {
      byClass[row.class as keyof typeof byClass] = Number(row.count);
    }
    const candidates = Number(counts.candidates ?? 0);
    const eligible = Number(counts.eligible ?? 0);
    const candidateWorks = Number(counts.candidateWorks ?? 0);
    const eligibleWorks = Number(counts.eligibleWorks ?? 0);
    const inputTokens = Number(counts.inputTokens ?? 0);
    const outputTokens = Number(counts.outputTokens ?? 0);
    const costMicrousd = Number(counts.costMicrousd ?? 0);
    return {
      scopeWorks: input.scopeWorks,
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
          input.scopeWorks <= 0
            ? 0
            : Math.round((candidateWorks * 10_000) / input.scopeWorks),
        eligibleBasisPoints:
          input.scopeWorks <= 0
            ? 0
            : Math.round((eligibleWorks * 10_000) / input.scopeWorks),
      },
      tokens: {
        input: inputTokens,
        output: outputTokens,
        total: inputTokens + outputTokens,
      },
      costMicrousd,
      estimate500: {
        candidates: scaled(candidates, input.scopeWorks),
        eligible: scaled(eligible, input.scopeWorks),
        inputTokens: scaled(inputTokens, input.scopeWorks),
        outputTokens: scaled(outputTokens, input.scopeWorks),
        costMicrousd: scaled(costMicrousd, input.scopeWorks),
      },
      byClass,
    };
  } finally {
    await client.end({ timeout: 5_000 });
  }
};
