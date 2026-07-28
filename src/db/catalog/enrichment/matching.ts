import { normalizeSortText } from "../normalize";
import type {
  AdapterManifest,
  EnrichmentTargetWork,
  MatchDecision,
  ProviderRecord,
} from "./types";

function sameOrderedCreators(
  left: readonly string[] | undefined,
  right: readonly string[],
): boolean {
  if (!left || left.length !== right.length) return false;
  return left.every(
    (creator, index) =>
      normalizeSortText(creator) === normalizeSortText(right[index] ?? ""),
  );
}

export function matchProviderRecord(input: {
  adapter: AdapterManifest;
  record: ProviderRecord;
  target: EnrichmentTargetWork;
}): MatchDecision {
  const { adapter, record, target } = input;
  if (record.state === "withdrawn") {
    return {
      outcome: "withdrawn",
      matchKind: "candidate",
      mappingConfidence: 0,
      reason: "Source record is withdrawn",
    };
  }
  if (record.rejectedReason?.trim()) {
    return {
      outcome: "rejected",
      matchKind: "candidate",
      mappingConfidence: 0,
      reason: record.rejectedReason.trim(),
    };
  }
  if (record.identityConflicts?.length) {
    return {
      outcome: "ambiguous",
      matchKind: "candidate",
      mappingConfidence: 0.5,
      reason: `Identity conflict requires review: ${[
        ...record.identityConflicts,
      ]
        .sort()
        .join("; ")}`,
    };
  }
  if (
    adapter.sourceKey === "bukie_editorial" &&
    record.targetWorkId === target.workId
  ) {
    return {
      outcome: "active",
      matchKind: "curated",
      mappingConfidence: 1,
      reason: "Bukie editorial evidence names the internal work ID",
    };
  }

  const titleMatches =
    record.title !== undefined &&
    normalizeSortText(record.title) === normalizeSortText(target.title);
  const creatorsMatch = sameOrderedCreators(
    record.orderedCreators,
    target.orderedCreators,
  );
  const conflictsWithTarget =
    (record.title !== undefined && !titleMatches) ||
    (record.orderedCreators !== undefined && !creatorsMatch);
  const recordIdentifiers = new Set(record.exactIdentifiers ?? []);
  const exactIdentifier = target.exactIdentifiers
    .filter((identifier) => recordIdentifiers.has(identifier))
    .sort()[0];
  if (exactIdentifier) {
    if (conflictsWithTarget) {
      return {
        outcome: "ambiguous",
        matchKind: "candidate",
        mappingConfidence: 0.5,
        reason: "Exact identifier conflicts with supplied work identity",
      };
    }
    return {
      outcome: "active",
      matchKind: "exact_identifier",
      mappingConfidence: 1,
      reason: `Exact identifier match: ${exactIdentifier}`,
    };
  }

  const providerRelation = target.providerRelations[adapter.sourceKey];
  if (providerRelation && record.providerWorkId === providerRelation) {
    if (conflictsWithTarget) {
      return {
        outcome: "ambiguous",
        matchKind: "candidate",
        mappingConfidence: 0.5,
        reason:
          "Provider-native relation conflicts with supplied work identity",
      };
    }
    return {
      outcome: "active",
      matchKind: "source_relationship",
      mappingConfidence: 1,
      reason: `Existing provider-native work relation: ${providerRelation}`,
    };
  }

  if (record.strongTuple && titleMatches && creatorsMatch) {
    return {
      outcome: "candidate",
      matchKind: "candidate",
      mappingConfidence: 0.85,
      reason: "Strong structured tuple created a review candidate",
    };
  }
  if (titleMatches && creatorsMatch) {
    return {
      outcome: "candidate",
      matchKind: "candidate",
      mappingConfidence: 0.7,
      reason:
        "Normalized title plus ordered creator is candidate evidence only",
    };
  }
  if (titleMatches) {
    return {
      outcome: "unmatched",
      matchKind: "candidate",
      mappingConfidence: 0.2,
      reason: "Title-only evidence cannot activate or propose an entity link",
    };
  }
  return {
    outcome: "unmatched",
    matchKind: "candidate",
    mappingConfidence: 0,
    reason: "No conservative identity evidence matched",
  };
}
