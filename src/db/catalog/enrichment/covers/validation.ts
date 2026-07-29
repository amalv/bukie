import type {
  CoverCandidateInput,
  CoverFlagCode,
  CoverGateCode,
  CoverInspection,
} from "./types";

export type CoverSourceContext = {
  sourceRevision: string | null;
  sourceRecordState: "active" | "withdrawn" | "deleted";
  sourceApproval: "pending" | "approved" | "suspended" | "retired";
  sourceLinkState: "active" | "candidate" | "rejected" | null;
  sourceLinkMatchKind:
    | "exact_identifier"
    | "source_relationship"
    | "curated"
    | "candidate"
    | null;
  metadataPolicy: unknown;
  assetPolicy: unknown;
};

type AssetPolicy = {
  cache?: unknown;
  display?: unknown;
  sourcePolicyVersion?: unknown;
  transform?: unknown;
  purgeOnWithdrawal?: unknown;
  attribution?: {
    required?: unknown;
  };
  fieldPermission?: {
    allowedFields?: unknown;
    cache?: unknown;
    display?: unknown;
    fetch?: unknown;
    transform?: unknown;
  };
};

const parseObject = (value: unknown): Record<string, unknown> => {
  try {
    const parsed: unknown =
      typeof value === "string" ? JSON.parse(value) : value;
    return parsed && typeof parsed === "object" && !Array.isArray(parsed)
      ? (parsed as Record<string, unknown>)
      : {};
  } catch {
    return {};
  }
};

export const parseCoverAssetPolicy = (value: unknown): AssetPolicy =>
  parseObject(value) as AssetPolicy;

const sourcePolicyVersion = (value: unknown): string | null => {
  const parsed = parseObject(value);
  return typeof parsed.sourcePolicyVersion === "string"
    ? parsed.sourcePolicyVersion
    : null;
};

const sorted = <T extends string>(values: readonly T[]): T[] =>
  [...new Set(values)].sort();

export const validateCoverCandidate = (input: {
  candidate: CoverCandidateInput;
  inspection: CoverInspection;
  source: CoverSourceContext | undefined;
  editionBelongsToWork: boolean;
  identityEvidenceVerified: boolean;
}): {
  gateCodes: CoverGateCode[];
  warningCodes: CoverFlagCode[];
  hardRejected: boolean;
} => {
  const { candidate, inspection, source } = input;
  const assetPolicy = parseCoverAssetPolicy(source?.assetPolicy);
  const allowedFields = assetPolicy.fieldPermission?.allowedFields;
  const sourceEligible = Boolean(
    source &&
      source.sourceRecordState === "active" &&
      source.sourceApproval === "approved" &&
      source.sourceLinkState === "active" &&
      source.sourceRevision === candidate.sourceRevision &&
      sourcePolicyVersion(source.metadataPolicy) ===
        candidate.sourcePolicyVersion &&
      assetPolicy.sourcePolicyVersion === candidate.sourcePolicyVersion &&
      assetPolicy.cache === true &&
      assetPolicy.display === true &&
      Array.isArray(allowedFields) &&
      allowedFields.includes("edition.covers") &&
      assetPolicy.fieldPermission?.fetch === true &&
      assetPolicy.fieldPermission.cache === true &&
      assetPolicy.fieldPermission.display === true &&
      (candidate.transformationHistory.length === 0 ||
        (assetPolicy.transform === true &&
          assetPolicy.fieldPermission.transform === true)),
  );

  const gateCodes: CoverGateCode[] = [];
  if (!sourceEligible || candidate.permissionState === "denied") {
    gateCodes.push("source_policy_ineligible");
  }
  if (
    candidate.permissionState !== "approved" ||
    !candidate.rightsBasis?.trim()
  ) {
    gateCodes.push("rights_evidence_incomplete");
  }
  if (
    assetPolicy.attribution?.required === true &&
    !candidate.attributionText?.trim() &&
    !candidate.attributionUrl?.trim()
  ) {
    gateCodes.push("attribution_incomplete");
  }

  if (
    candidate.representationType === "selected_edition" &&
    (!candidate.editionId || !input.editionBelongsToWork)
  ) {
    gateCodes.push("identity_conflict");
  } else if (
    candidate.representationType === "selected_edition" &&
    (![
      "exact_isbn",
      "provider_edition_relation",
      "approved_strong_edition_tuple",
    ].includes(candidate.identityMatchKind) ||
      !input.identityEvidenceVerified)
  ) {
    gateCodes.push(
      candidate.identityMatchKind === "conflicting"
        ? "identity_conflict"
        : "identity_evidence_ineligible",
    );
  } else if (
    candidate.representationType === "work_representative" &&
    (!["provider_work_relation", "curated_work_relation"].includes(
      candidate.identityMatchKind,
    ) ||
      !input.identityEvidenceVerified)
  ) {
    gateCodes.push(
      candidate.identityMatchKind === "conflicting"
        ? "identity_conflict"
        : "identity_evidence_ineligible",
    );
  }

  if (inspection.decodeResult === "corrupt") {
    gateCodes.push("decode_failed");
  } else if (inspection.decodeResult === "unsupported") {
    gateCodes.push("media_type_unsupported");
  }
  if (inspection.flags.includes("adaptation_conflict")) {
    gateCodes.push("adaptation_conflict");
  }
  if (inspection.flags.includes("locale_conflict")) {
    gateCodes.push("locale_conflict");
  }

  const warningCodes = inspection.flags.filter(
    (flag) =>
      !["corrupt", "adaptation_conflict", "locale_conflict"].includes(flag),
  );
  const hardRejected = gateCodes.some((code) =>
    [
      "source_policy_ineligible",
      "identity_conflict",
      "decode_failed",
      "media_type_unsupported",
      "adaptation_conflict",
      "locale_conflict",
    ].includes(code),
  );
  return {
    gateCodes: sorted(gateCodes),
    warningCodes: sorted(warningCodes),
    hardRejected,
  };
};

export const coverPolicyRequiresPurge = (assetPolicy: unknown): boolean =>
  parseCoverAssetPolicy(assetPolicy).purgeOnWithdrawal === true;
