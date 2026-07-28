import type {
  CatalogEntityType,
  CatalogFieldKey,
  ProvenanceKind,
} from "../values";

export type EnrichmentFieldClass = "metadata" | "text" | "asset";
export type AdapterState = "enabled" | "pending" | "suspended" | "retired";
export type LinkOutcome =
  | "unmatched"
  | "candidate"
  | "ambiguous"
  | "active"
  | "rejected"
  | "withdrawn";

export type FieldPermission = {
  allowedFields: readonly CatalogFieldKey[];
  fetch: boolean;
  cache: boolean;
  retain: "none" | "selected_fields" | "full";
  transform: boolean;
  display: boolean;
};

export type AdapterManifest = {
  sourceId: string;
  sourceKey: string;
  sourceName: string;
  adapterId: string;
  adapterVersion: string;
  sourcePolicyVersion: string;
  policyReviewDate: string;
  policySources: readonly string[];
  state: AdapterState;
  disabledReason: string | null;
  nextReviewDate: string;
  permissions: Record<EnrichmentFieldClass, FieldPermission>;
  acquisition: {
    method:
      | "repository_artifact"
      | "wikimedia_api"
      | "licensed_api"
      | "licensed_feed"
      | "manual"
      | "disabled";
    host: string | null;
    perHostConcurrency: number;
    minimumIntervalMs: number;
    credentials: readonly string[];
    cache: boolean;
    conditionalRetrieval: "etag_and_last_modified" | "snapshot" | "none";
    retry: {
      ceiling: number;
      baseDelayMs: number;
      maximumDelayMs: number;
      jitterRatio: number;
      respectRetryAfter: boolean;
    };
  };
  attribution: {
    required: boolean;
    text: string | null;
    url: string | null;
    placement: string | null;
  };
  withdrawal: {
    tombstone: boolean;
    purgeRawPayload: boolean;
    purgeCachedAssets: boolean;
    recomputeProposals: boolean;
  };
  sourceRevision: {
    kind: "content_hash" | "provider_revision" | "snapshot";
    required: boolean;
  };
  proposedEvidenceOnly: true;
};

export type SampleWork = {
  workId: string;
  legacyRecordKey: string;
  title: string;
  orderedCreators: readonly string[];
  providerRelations: Readonly<Record<string, string>>;
  exactIdentifiers: readonly string[];
};

export type EnrichmentSampleManifest = {
  id: string;
  version: string;
  reviewedAt: string;
  works: readonly SampleWork[];
};

export type EnrichmentEvidence = {
  fieldClass: EnrichmentFieldClass;
  fieldKey: CatalogFieldKey;
  value: unknown;
  sourcePath: string;
  provenanceKind: ProvenanceKind;
  actorRef?: string;
  reason?: string;
};

export type ProviderRecord = {
  adapterId: string;
  recordKey: string;
  sourceRevision: string;
  retrievedAt: number;
  targetWorkId: string;
  title?: string;
  orderedCreators?: readonly string[];
  providerWorkId?: string;
  exactIdentifiers?: readonly string[];
  strongTuple?: Readonly<Record<string, string>>;
  identityConflicts?: readonly string[];
  rejectedReason?: string;
  state?: "active" | "withdrawn";
  evidence: readonly EnrichmentEvidence[];
  rawPayload?: unknown;
  acquisition?: {
    successful: boolean;
    cacheHit?: boolean;
    conditionalHit?: boolean;
    latencyMs?: number;
    retries?: number;
    status?: number;
    retryAfterMs?: number;
    responseBytes?: number;
  };
};

export type MatchDecision = {
  outcome: LinkOutcome;
  matchKind:
    | "exact_identifier"
    | "source_relationship"
    | "curated"
    | "candidate";
  mappingConfidence: number;
  reason: string;
};

export type EnrichmentSourceRecord = {
  id: string;
  sourceId: string;
  recordKey: string;
  upstreamRecordKey: string;
  sourceRevision: string;
  sourceModifiedAt: number | null;
  retrievedAt: number;
  payloadJson: string | null;
  payloadHash: string | null;
  importerVersion: string;
  sourceRowHash: string;
  state: "active" | "withdrawn" | "deleted";
};

export type EnrichmentSourceLink = {
  id: string;
  sourceRecordId: string;
  entityType: CatalogEntityType;
  entityId: string;
  matchKind: MatchDecision["matchKind"];
  mappingConfidence: number;
  state: "active" | "candidate" | "rejected";
  outcome: LinkOutcome;
  actorRef: string | null;
  reason: string;
  createdAt: number;
};

export type EnrichmentObservation = {
  id: string;
  sourceRecordId: string;
  entityType: CatalogEntityType;
  entityId: string;
  fieldKey: CatalogFieldKey;
  valueJson: string;
  comparisonHash: string;
  provenanceKind: ProvenanceKind;
  sourcePath: string;
  sourceModifiedAt: number | null;
  retrievedAt: number;
  mappingConfidence: number;
  state: "active" | "stale" | "withdrawn" | "invalid";
  actorRef: string | null;
  reason: string | null;
  derivationName: string | null;
  derivationVersion: string | null;
  parentIdsJson: string | null;
};

export type EnrichmentRunReport = {
  requestedRecords: number;
  successfulRequests: number;
  cacheHits: number;
  conditionalHits: number;
  latencyMs: number;
  retries: number;
  statusClasses: Record<"2xx" | "3xx" | "4xx" | "5xx" | "other", number>;
  throttles: number;
  retryAfterMs: number;
  responseBytes: number;
  sourceRevisionAgeMs: number;
  links: Record<LinkOutcome, number>;
  observations: {
    created: number;
    reused: number;
    rejected: number;
    omitted: number;
  };
  policyBlocks: number;
  acquisitionFailures: number;
  providerFailures: number;
  parsingFailures: number;
  normalizationFailures: number;
  reviewQueueCandidates: number;
};

export type EnrichmentRunArtifact = {
  runId: string;
  manifestId: string;
  manifestVersion: string;
  contentHash: string;
  requestedWorkIds: readonly string[];
  adapterSnapshots: readonly {
    adapterId: string;
    adapterVersion: string;
    sourcePolicyVersion: string;
    sourceRevision: string;
    snapshotId: string;
  }[];
  metadataSources: readonly Record<string, unknown>[];
  sourceRecords: readonly EnrichmentSourceRecord[];
  sourceRecordLinks: readonly EnrichmentSourceLink[];
  fieldObservations: readonly EnrichmentObservation[];
  proposedResolutionHeads: readonly [];
  report: EnrichmentRunReport;
};
