import type {
  CoverDecisionState,
  CoverDecodeResult,
  CoverIdentityMatchKind,
  CoverPermissionState,
  CoverRepresentationType,
} from "../../values";

export const COVER_POLICY_VERSION = "poc-cover-policy-2026-07.v1";
export const COVER_INSPECTION_VERSION = "cover-inspection-2026-07-29.v1";

export const COVER_FLAG_CODES = [
  "corrupt",
  "tiny_dimensions",
  "square_canvas",
  "sidebars",
  "extreme_aspect_ratio",
  "extreme_crop",
  "blur_risk",
  "upscaling_risk",
  "duplicate",
  "locale_conflict",
  "adaptation_conflict",
] as const;

export const COVER_GATE_CODES = [
  "source_policy_ineligible",
  "attribution_incomplete",
  "identity_evidence_ineligible",
  "identity_conflict",
  "decode_failed",
  "media_type_unsupported",
  "adaptation_conflict",
  "locale_conflict",
] as const;

export type CoverFlagCode = (typeof COVER_FLAG_CODES)[number];
export type CoverGateCode = (typeof COVER_GATE_CODES)[number];

export type CoverTransformation = {
  operation: string;
  version: string;
  parameters: Readonly<Record<string, string | number | boolean>>;
};

export type CoverCandidateInput = {
  workId: string;
  editionId: string | null;
  sourceRecordId: string;
  representationType: CoverRepresentationType;
  identityMatchKind: CoverIdentityMatchKind;
  identityEvidence: Readonly<Record<string, unknown>>;
  permissionState: CoverPermissionState;
  rightsBasis: string | null;
  attributionText: string | null;
  attributionUrl: string | null;
  sourceUrl: string;
  sourceRevision: string;
  sourcePolicyVersion: string;
  objectKey: string;
  transformationHistory: readonly CoverTransformation[];
  createdAt: number;
};

export type CoverInspectionSignals = {
  localeConflict?: boolean;
  adaptationConflict?: boolean;
  blurRisk?: boolean;
  sidebars?: boolean;
  extremeCrop?: boolean;
};

export type CoverInspection = {
  mediaType: string | null;
  byteSize: number;
  width: number | null;
  height: number | null;
  aspectRatio: number | null;
  checksum: string;
  decodeResult: CoverDecodeResult;
  flags: CoverFlagCode[];
  qualityScore: number;
  inspectionVersion: string;
  inspectedAt: number;
};

export type CoverCandidateResult = {
  candidateId: string;
  inspectionId: string;
  decisionId: string;
  state: CoverDecisionState;
  gateCodes: CoverGateCode[];
  warningCodes: CoverFlagCode[];
  changed: boolean;
};

export type CoverSelection = {
  workId: string;
  candidateId: string | null;
  objectKey: string;
  representationType: CoverRepresentationType | null;
  editionId: string | null;
  rightsStatus: "cleared" | "deferred_poc";
  rightsCleared: boolean;
  publicDisplayEligible: boolean;
  state: "selected" | "placeholder" | "withdrawn" | "rolled_back";
};
