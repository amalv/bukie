import {
  canonicalJson,
  deterministicCatalogId,
  hashCanonicalJson,
} from "../identity";
import { sanitizeDiagnostic } from "./acquisition";
import { matchProviderRecord } from "./matching";
import {
  assertAdapterEnabled,
  authorizeField,
  getAdapterManifest,
  metadataSourceRow,
} from "./policies";
import {
  assertSampleScope,
  ENRICHMENT_SAMPLE_MANIFEST,
  getSampleWork,
} from "./sample-manifest";
import type {
  AdapterManifest,
  EnrichmentRunArtifact,
  EnrichmentRunReport,
  LinkOutcome,
  ProviderRecord,
} from "./types";

export const ENRICHMENT_RUNNER_VERSION = "catalog-enrichment-runner-v1";

function emptyReport(): EnrichmentRunReport {
  return {
    requestedRecords: 0,
    successfulRequests: 0,
    cacheHits: 0,
    conditionalHits: 0,
    latencyMs: 0,
    retries: 0,
    statusClasses: {
      "2xx": 0,
      "3xx": 0,
      "4xx": 0,
      "5xx": 0,
      other: 0,
    },
    throttles: 0,
    retryAfterMs: 0,
    responseBytes: 0,
    sourceRevisionAgeMs: 0,
    links: {
      unmatched: 0,
      candidate: 0,
      ambiguous: 0,
      active: 0,
      rejected: 0,
      withdrawn: 0,
    },
    observations: {
      created: 0,
      reused: 0,
      rejected: 0,
      omitted: 0,
    },
    policyBlocks: 0,
    acquisitionFailures: 0,
    providerFailures: 0,
    parsingFailures: 0,
    normalizationFailures: 0,
    reviewQueueCandidates: 0,
  };
}

function incrementStatus(
  report: EnrichmentRunReport,
  status: number | undefined,
) {
  if (status === undefined) return;
  const key =
    status >= 200 && status < 300
      ? "2xx"
      : status >= 300 && status < 400
        ? "3xx"
        : status >= 400 && status < 500
          ? "4xx"
          : status >= 500 && status < 600
            ? "5xx"
            : "other";
  report.statusClasses[key] += 1;
}

function containsSensitiveKey(value: unknown): boolean {
  if (Array.isArray(value)) return value.some(containsSensitiveKey);
  if (!value || typeof value !== "object") return false;
  return Object.entries(value).some(
    ([key, entry]) =>
      /authorization|cookie|credential|password|secret|token|api[-_]?key/i.test(
        key,
      ) || containsSensitiveKey(entry),
  );
}

function retainedPayload(
  adapter: AdapterManifest,
  record: ProviderRecord,
): unknown | null {
  if (record.state === "withdrawn" && adapter.withdrawal.purgeRawPayload) {
    return null;
  }
  const permissions = record.evidence.map(
    (entry) => adapter.permissions[entry.fieldClass],
  );
  if (record.rawPayload !== undefined) {
    if (containsSensitiveKey(record.rawPayload)) {
      throw new Error(
        `Enrichment retention refused: sensitive payload fields were supplied for ${adapter.adapterId}`,
      );
    }
    if (!permissions.some((permission) => permission.retain === "full")) {
      throw new Error(
        `Enrichment retention refused: raw payload retention is not permitted for ${adapter.adapterId}`,
      );
    }
    return sanitizeDiagnostic(record.rawPayload);
  }
  if (
    permissions.some(
      (permission) =>
        permission.retain === "selected_fields" || permission.retain === "full",
    )
  ) {
    return {
      evidence: record.evidence.map((entry) => ({
        fieldClass: entry.fieldClass,
        fieldKey: entry.fieldKey,
        sourcePath: entry.sourcePath,
        value: entry.value,
      })),
      recordKey: record.recordKey,
      targetWorkId: record.targetWorkId,
    };
  }
  return null;
}

function linkState(outcome: LinkOutcome): "active" | "candidate" | "rejected" {
  if (outcome === "active") return "active";
  if (outcome === "rejected") return "rejected";
  return "candidate";
}

function assertRecordRevision(
  adapter: AdapterManifest,
  record: ProviderRecord,
) {
  if (adapter.sourceRevision.required && !record.sourceRevision.trim()) {
    throw new Error(
      `Enrichment identity refused: ${adapter.adapterId} requires a source revision`,
    );
  }
}

export function buildEnrichmentRun(input: {
  requestedWorkIds: readonly string[];
  records: readonly ProviderRecord[];
}): EnrichmentRunArtifact {
  const requestedWorks = assertSampleScope(input.requestedWorkIds);
  const requestedIds = new Set(requestedWorks.map((work) => work.workId));
  const records = [...input.records].sort((left, right) =>
    canonicalJson(left).localeCompare(canonicalJson(right)),
  );
  const report = emptyReport();
  report.requestedRecords = records.length;
  const adapters = new Map<string, AdapterManifest>();
  const recordRevisions = new Set<string>();
  for (const record of records) {
    if (!requestedIds.has(record.targetWorkId)) {
      throw new Error(
        `Enrichment scope refused: provider record ${record.recordKey} targets an unrequested work`,
      );
    }
    const adapter = getAdapterManifest(record.adapterId);
    assertAdapterEnabled(adapter);
    assertRecordRevision(adapter, record);
    const recordRevisionKey = `${adapter.adapterId}:${record.recordKey}:${record.sourceRevision}`;
    if (recordRevisions.has(recordRevisionKey)) {
      throw new Error(
        `Enrichment identity refused: duplicate source record revision ${recordRevisionKey}`,
      );
    }
    recordRevisions.add(recordRevisionKey);
    adapters.set(adapter.adapterId, adapter);
    for (const evidence of record.evidence) {
      authorizeField({
        adapter,
        fieldClass: evidence.fieldClass,
        fieldKey: evidence.fieldKey,
      });
    }
  }

  const runInputHash = hashCanonicalJson({
    adapters: [...adapters.values()]
      .map((adapter) => ({
        adapterId: adapter.adapterId,
        adapterVersion: adapter.adapterVersion,
        sourcePolicyVersion: adapter.sourcePolicyVersion,
      }))
      .sort((left, right) => left.adapterId.localeCompare(right.adapterId)),
    manifestId: ENRICHMENT_SAMPLE_MANIFEST.id,
    manifestVersion: ENRICHMENT_SAMPLE_MANIFEST.version,
    records,
    requestedWorkIds: [...requestedIds].sort(),
    runnerVersion: ENRICHMENT_RUNNER_VERSION,
  });
  const runId = deterministicCatalogId(
    "enrichment_run",
    ENRICHMENT_SAMPLE_MANIFEST.id,
    runInputHash,
  );
  const sourceRecords: EnrichmentRunArtifact["sourceRecords"][number][] = [];
  const sourceRecordLinks: EnrichmentRunArtifact["sourceRecordLinks"][number][] =
    [];
  const fieldObservations: EnrichmentRunArtifact["fieldObservations"][number][] =
    [];
  const latestRetrievedAt = Math.max(
    0,
    ...records.map((record) => record.retrievedAt),
  );

  for (const record of records) {
    const adapter = getAdapterManifest(record.adapterId);
    const target = getSampleWork(record.targetWorkId);
    const match = matchProviderRecord({ adapter, record, target });
    report.links[match.outcome] += 1;
    if (match.outcome === "candidate" || match.outcome === "ambiguous") {
      report.reviewQueueCandidates += 1;
    }
    const payload = retainedPayload(adapter, record);
    const upstreamRevisionKey = `${record.recordKey}@${record.sourceRevision}`;
    const sourceRecordId = deterministicCatalogId(
      "source_record_revision",
      adapter.sourceKey,
      upstreamRevisionKey,
    );
    const payloadJson = payload === null ? null : canonicalJson(payload);
    const sourceRowHash = hashCanonicalJson({
      payload,
      recordKey: record.recordKey,
      sourceRevision: record.sourceRevision,
      state: record.state ?? "active",
    });
    sourceRecords.push({
      id: sourceRecordId,
      sourceId: adapter.sourceId,
      recordKey: upstreamRevisionKey,
      upstreamRecordKey: record.recordKey,
      sourceRevision: record.sourceRevision,
      sourceModifiedAt: null,
      retrievedAt: record.retrievedAt,
      payloadJson,
      payloadHash: payloadJson ? hashCanonicalJson(payload) : null,
      importerVersion: ENRICHMENT_RUNNER_VERSION,
      sourceRowHash,
      state: record.state === "withdrawn" ? "withdrawn" : "active",
    });
    const linkId = deterministicCatalogId(
      "source_record_link",
      sourceRecordId,
      `work:${record.targetWorkId}:${match.outcome}`,
    );
    sourceRecordLinks.push({
      id: linkId,
      sourceRecordId,
      entityType: "work",
      entityId: record.targetWorkId,
      matchKind: match.matchKind,
      mappingConfidence: match.mappingConfidence,
      state: linkState(match.outcome),
      outcome: match.outcome,
      actorRef:
        match.matchKind === "curated" || match.outcome === "rejected"
          ? "system:catalog-enrichment"
          : null,
      reason: match.reason,
      createdAt: record.retrievedAt,
    });

    const acquisition = record.acquisition;
    if (acquisition?.successful) report.successfulRequests += 1;
    else if (acquisition) {
      if ((acquisition.status ?? 0) >= 400) report.providerFailures += 1;
      else report.acquisitionFailures += 1;
    }
    report.cacheHits += Number(acquisition?.cacheHit ?? false);
    report.conditionalHits += Number(acquisition?.conditionalHit ?? false);
    report.latencyMs += acquisition?.latencyMs ?? 0;
    report.retries += acquisition?.retries ?? 0;
    report.retryAfterMs += acquisition?.retryAfterMs ?? 0;
    report.responseBytes += acquisition?.responseBytes ?? 0;
    report.throttles += Number((acquisition?.retryAfterMs ?? 0) > 0);
    incrementStatus(report, acquisition?.status);
    report.sourceRevisionAgeMs = Math.max(
      report.sourceRevisionAgeMs,
      latestRetrievedAt - record.retrievedAt,
    );

    if (match.outcome !== "active") {
      report.observations.omitted += record.evidence.length;
      continue;
    }
    for (const evidence of record.evidence) {
      const comparisonHash = hashCanonicalJson(evidence.value);
      const observationId = deterministicCatalogId(
        "field_observation",
        sourceRecordId,
        `work:${record.targetWorkId}:${evidence.fieldKey}:${comparisonHash}`,
      );
      fieldObservations.push({
        id: observationId,
        sourceRecordId,
        entityType: "work",
        entityId: record.targetWorkId,
        fieldKey: evidence.fieldKey,
        valueJson: canonicalJson(evidence.value),
        comparisonHash,
        provenanceKind: evidence.provenanceKind,
        sourcePath: evidence.sourcePath,
        sourceModifiedAt: null,
        retrievedAt: record.retrievedAt,
        mappingConfidence: match.mappingConfidence,
        state: record.state === "withdrawn" ? "withdrawn" : "active",
        actorRef: evidence.actorRef ?? null,
        reason: evidence.reason ?? null,
        derivationName: null,
        derivationVersion: null,
        parentIdsJson: null,
      });
      report.observations.created += 1;
    }
  }

  const adapterSnapshots = [...adapters.values()]
    .map((adapter) => {
      const sourceRevision = records
        .filter((record) => record.adapterId === adapter.adapterId)
        .map((record) => record.sourceRevision)
        .sort()
        .join("+");
      return {
        adapterId: adapter.adapterId,
        adapterVersion: adapter.adapterVersion,
        sourcePolicyVersion: adapter.sourcePolicyVersion,
        sourceRevision,
        snapshotId: deterministicCatalogId(
          "source_snapshot",
          adapter.sourceKey,
          hashCanonicalJson({
            adapterVersion: adapter.adapterVersion,
            manifestVersion: ENRICHMENT_SAMPLE_MANIFEST.version,
            sourcePolicyVersion: adapter.sourcePolicyVersion,
            sourceRevision,
          }),
        ),
      };
    })
    .sort((left, right) => left.adapterId.localeCompare(right.adapterId));

  const metadataSources = [...adapters.values()]
    .map(metadataSourceRow)
    .sort((left, right) =>
      canonicalJson(left).localeCompare(canonicalJson(right)),
    );
  sourceRecords.sort((left, right) => left.id.localeCompare(right.id));
  sourceRecordLinks.sort((left, right) => left.id.localeCompare(right.id));
  fieldObservations.sort((left, right) => left.id.localeCompare(right.id));
  const artifactWithoutHash = {
    runId,
    manifestId: ENRICHMENT_SAMPLE_MANIFEST.id,
    manifestVersion: ENRICHMENT_SAMPLE_MANIFEST.version,
    requestedWorkIds: [...requestedIds].sort(),
    adapterSnapshots,
    metadataSources,
    sourceRecords,
    sourceRecordLinks,
    fieldObservations,
    proposedResolutionHeads: [] as const,
    report,
  };
  return {
    ...artifactWithoutHash,
    contentHash: hashCanonicalJson(artifactWithoutHash),
  };
}
