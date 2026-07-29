import type { DescriptionClass, DescriptionDecisionState } from "../../values";

export const DESCRIPTION_POLICY_VERSION = "description-gates-2026-07-29.v1";

export const DESCRIPTION_REJECTION_CODES = [
  "claim_unsupported",
  "claim_text_not_in_candidate",
  "candidate_claim_coverage_incomplete",
  "parent_evidence_ineligible",
  "identity_mismatch",
  "evidence_conflict_unresolved",
  "length_out_of_range",
  "readability_out_of_range",
  "specificity_insufficient",
  "tone_non_neutral",
  "spoiler_risk",
  "copying_similarity_high",
  "licensed_derivative_not_permitted",
  "licensed_provenance_incomplete",
  "editorial_provenance_incomplete",
  "model_provenance_incomplete",
  "source_revision_mismatch",
  "source_policy_ineligible",
  "human_review_rejected",
] as const;

export const DESCRIPTION_WARNING_CODES = [
  "copying_exact_eight_word_match",
  "readability_borderline",
  "ambiguous_identity_review",
  "sensitive_content_review",
  "sparse_evidence_review",
  "initial_model_review",
  "editorial_review",
  "policy_version_review",
] as const;

export type DescriptionRejectionCode =
  (typeof DESCRIPTION_REJECTION_CODES)[number];
export type DescriptionWarningCode = (typeof DESCRIPTION_WARNING_CODES)[number];

export type DescriptionClaimInput = {
  text: string;
  parentObservationIds: readonly string[];
};

export type DescriptionParentEvidence = {
  id: string;
  entityType: string;
  entityId: string;
  workId: string | null;
  fieldKey: string;
  value: unknown;
  sourceText: string | null;
  eligible: boolean;
  unresolvedConflict: boolean;
};

type CandidateCommon = {
  workId: string;
  text: string;
  sourceRecordId: string;
  sourceRevision: string;
  sourcePolicyVersion: string;
  descriptionPolicyVersion: string;
  claims: readonly DescriptionClaimInput[];
  comparisonTexts: readonly string[];
  ambiguousIdentity?: boolean;
  sensitiveContent?: boolean;
  createdAt: number;
};

export type LicensedDescriptionInput = CandidateCommon & {
  descriptionClass: "licensed_verbatim";
  license: {
    name: string;
    url: string;
    attributionText: string | null;
    derivativesPermitted: boolean;
    sourceText: string;
    transformed: boolean;
  };
};

export type EditorialDescriptionInput = CandidateCommon & {
  descriptionClass: "bukie_editorial";
  editorial: {
    editorRef: string;
    reason: string;
    revision: string;
  };
};

export type ModelDescriptionInput = CandidateCommon & {
  descriptionClass: "model_assisted_candidate";
  model: {
    modelId: string;
    modelVersion: string;
    promptVersion: string;
    generatedAt: number;
    generationDurationMs: number;
    inputTokens: number;
    outputTokens: number;
    costMicrousd: number;
  };
};

export type DescriptionCandidateInput =
  | LicensedDescriptionInput
  | EditorialDescriptionInput
  | ModelDescriptionInput;

export type DescriptionValidationResult = {
  rejectionCodes: DescriptionRejectionCode[];
  warningCodes: DescriptionWarningCode[];
  requiresHumanReview: boolean;
  wordCount: number;
  readabilityScore: number;
  qualityScore: number;
};

export type DescriptionCandidateResult = {
  candidateId: string;
  observationId: string;
  decisionId: string;
  state: DescriptionDecisionState;
  validation: DescriptionValidationResult;
  queue: "not_required" | "queued" | "deduplicated" | "overflow_paused";
  changed: boolean;
};

export type DescriptionMetrics = {
  scopeWorks: number;
  candidates: number;
  rejected: number;
  reviewed: number;
  eligible: number;
  withdrawn: number;
  invalidated: number;
  paused: number;
  queue: {
    queued: number;
    claimed: number;
    completed: number;
    cancelled: number;
  };
  coverage: {
    candidateWorks: number;
    eligibleWorks: number;
    candidateBasisPoints: number;
    eligibleBasisPoints: number;
  };
  tokens: {
    input: number;
    output: number;
    total: number;
  };
  costMicrousd: number;
  estimate500: {
    candidates: number;
    eligible: number;
    inputTokens: number;
    outputTokens: number;
    costMicrousd: number;
  };
  byClass: Record<DescriptionClass, number>;
};
