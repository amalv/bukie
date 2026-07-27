import { canonicalJson, hashCanonicalJson } from "./identity";
import { parsePartialDate } from "./normalize";
import type {
  CatalogFieldKey,
  ObservationState,
  ProvenanceKind,
  ResolutionState,
} from "./values";

export type ResolutionCandidate = {
  id: string;
  sourceKey: string;
  sourceApproved: boolean;
  sourcePriority: number;
  value: unknown;
  provenanceKind: ProvenanceKind;
  state: ObservationState;
  retrievedAt: number;
  actorRef?: string;
  reason?: string;
};

export type ResolutionDecision = {
  state: ResolutionState;
  selectedObservationId: string | null;
  comparisonHash: string | null;
  reason: string;
};

function isPublicBibliographicField(fieldKey: CatalogFieldKey): boolean {
  return !fieldKey.startsWith("legacy.");
}

function compareCandidate(
  left: ResolutionCandidate,
  right: ResolutionCandidate,
) {
  if (left.sourcePriority !== right.sourcePriority) {
    return left.sourcePriority - right.sourcePriority;
  }
  if (
    left.sourceKey === right.sourceKey &&
    left.retrievedAt !== right.retrievedAt
  ) {
    return right.retrievedAt - left.retrievedAt;
  }
  return left.id.localeCompare(right.id);
}

function compatiblePublicationDate(
  candidates: ResolutionCandidate[],
): ResolutionCandidate | "conflicting" | null {
  const parsed = candidates.map((candidate) => ({
    candidate,
    date: parsePartialDate(String(candidate.value)),
  }));
  if (parsed.some((entry) => entry.date === null)) return null;
  const ordered = parsed.sort((left, right) => {
    const precision = { year: 1, month: 2, day: 3 } as const;
    return (
      precision[right.date?.precision ?? "year"] -
      precision[left.date?.precision ?? "year"]
    );
  });
  const mostPrecise = ordered[0];
  if (!mostPrecise?.date) return null;
  const compatible = ordered.every(
    (entry) =>
      entry.date && mostPrecise.date?.value.startsWith(entry.date.value),
  );
  return compatible ? mostPrecise.candidate : "conflicting";
}

export function resolveField(
  fieldKey: CatalogFieldKey,
  candidates: ResolutionCandidate[],
): ResolutionDecision {
  const approved = candidates.filter((candidate) => candidate.sourceApproved);
  const eligible = approved.filter(
    (candidate) =>
      candidate.state === "active" &&
      !(
        candidate.provenanceKind === "synthetic" &&
        isPublicBibliographicField(fieldKey)
      ),
  );
  const curated = eligible
    .filter(
      (candidate) =>
        candidate.provenanceKind === "curated" &&
        Boolean(candidate.actorRef?.trim()) &&
        Boolean(candidate.reason?.trim()),
    )
    .sort(compareCandidate);
  if (curated[0]) {
    return {
      state: "present",
      selectedObservationId: curated[0].id,
      comparisonHash: hashCanonicalJson(curated[0].value),
      reason: "Selected active curated correction",
    };
  }
  if (eligible.length === 0) {
    if (approved.some((candidate) => candidate.state === "withdrawn")) {
      return {
        state: "withdrawn",
        selectedObservationId: null,
        comparisonHash: null,
        reason: "All previously eligible observations are withdrawn",
      };
    }
    const stale = approved.filter(
      (candidate) =>
        candidate.state === "stale" &&
        !(
          candidate.provenanceKind === "synthetic" &&
          isPublicBibliographicField(fieldKey)
        ),
    );
    if (stale.length) {
      const selected = [...stale].sort(compareCandidate)[0];
      return {
        state: "stale",
        selectedObservationId: selected.id,
        comparisonHash: hashCanonicalJson(selected.value),
        reason: "Selected value is past its freshness target",
      };
    }
    return {
      state: "missing",
      selectedObservationId: null,
      comparisonHash: null,
      reason: "No eligible approved observation",
    };
  }

  const bestPriority = Math.min(
    ...eligible.map((candidate) => candidate.sourcePriority),
  );
  const preferred = eligible.filter(
    (candidate) => candidate.sourcePriority === bestPriority,
  );
  const hashes = new Set(
    preferred.map((candidate) => hashCanonicalJson(candidate.value)),
  );
  if (hashes.size === 1) {
    const selected = [...preferred].sort(compareCandidate)[0];
    return {
      state: "present",
      selectedObservationId: selected.id,
      comparisonHash: hashCanonicalJson(selected.value),
      reason: "Selected equivalent claim from configured source precedence",
    };
  }

  if (fieldKey === "edition.publication_date") {
    const compatible = compatiblePublicationDate(preferred);
    if (compatible && compatible !== "conflicting") {
      return {
        state: "present",
        selectedObservationId: compatible.id,
        comparisonHash: hashCanonicalJson(compatible.value),
        reason: "Selected compatible claim with greater date precision",
      };
    }
  }

  return {
    state: "conflicting",
    selectedObservationId: null,
    comparisonHash: hashCanonicalJson(
      preferred.map((candidate) => canonicalJson(candidate.value)).sort(),
    ),
    reason: "Equally eligible approved observations conflict",
  };
}
