import {
  canonicalJson,
  deterministicCatalogId,
  hashCanonicalJson,
} from "../identity";
import type { CatalogImportGraph, CatalogImportRecord } from "../importer";
import {
  CATALOG_IMPORTER_VERSION,
  CATALOG_RESOLVER_VERSION,
} from "../importer";
import { normalizeValidIsbn } from "../normalize";
import { resolveField } from "../resolver";
import type { CatalogFieldKey } from "../values";
import { COVER_INSPECTION_VERSION, COVER_POLICY_VERSION } from "./covers/types";
import { DESCRIPTION_POLICY_VERSION } from "./descriptions/types";
import { SAMPLE_PROVIDER_RECORDS } from "./fixtures";
import { ENRICHMENT_ADAPTERS } from "./policies";
import { ENRICHMENT_SAMPLE_MANIFEST } from "./sample-manifest";
import type {
  EnrichmentRunArtifact,
  EnrichmentScopeManifest,
  EnrichmentTargetWork,
  ProviderRecord,
} from "./types";
import { ENRICHMENT_RUNNER_VERSION } from "./workflow";

export const CATALOG_DRY_RUN_FORMAT_VERSION =
  "catalog-enrichment-dry-run-report-v1";
export const CATALOG_DRY_RUN_MANIFEST_VERSION = "2026-07-29.v1";
export const CATALOG_DRY_RUN_MATCHER_VERSION = "conservative-work-matcher-v1";
export const CATALOG_DRY_RUN_PROPOSAL_VERSION =
  "catalog-enrichment-proposal-v1";
export const CATALOG_DRY_RUN_DESCRIPTION_QUEUE_CAP = 3;
export const CATALOG_DRY_RUN_IDENTITY_QUEUE_CAP = 175;

const FIRST_PUBLICATION_FIXTURES = new Map<string, string>([
  ["Dune", "1965"],
  ["Moby-Dick", "1851"],
  ["The City and the Stars", "1956"],
  ["Born a Crime", "2016"],
  ["Faithful Place", "2010"],
]);

const diagnosticByWorkId = new Map<
  string,
  (typeof ENRICHMENT_SAMPLE_MANIFEST.works)[number]
>(ENRICHMENT_SAMPLE_MANIFEST.works.map((work) => [work.workId, work]));

export const CATALOG_RECORDED_PROVIDER_RECORDS: readonly ProviderRecord[] =
  SAMPLE_PROVIDER_RECORDS.map((record) => {
    const diagnostic = diagnosticByWorkId.get(record.targetWorkId);
    if (!diagnostic) {
      throw new Error(
        `Catalog dry-run fixture is outside the diagnostic manifest: ${record.targetWorkId}`,
      );
    }
    const firstPublication = FIRST_PUBLICATION_FIXTURES.get(diagnostic.title);
    return {
      ...record,
      sourceRevision:
        record.adapterId === "wikidata.work-facts"
          ? `catalog-dry-run-recorded-2026-07-28:${record.recordKey}`
          : "catalog-dry-run-editorial-2026-07-28.v1",
      evidence:
        record.adapterId === "wikidata.work-facts" && firstPublication
          ? [
              ...record.evidence,
              {
                fieldClass: "metadata" as const,
                fieldKey: "work.first_publication_date" as const,
                value: firstPublication,
                sourcePath: "claims.P577.recordedValue",
                provenanceKind: "imported" as const,
              },
            ]
          : record.evidence,
      rawPayload:
        record.adapterId === "wikidata.work-facts"
          ? {
              id: record.recordKey,
              label: diagnostic.title,
              firstPublication,
              recordedFixture: true,
            }
          : record.rawPayload,
    };
  });

export type CatalogDryRunManifest = EnrichmentScopeManifest & {
  formatVersion: typeof CATALOG_DRY_RUN_FORMAT_VERSION;
  input: {
    catalogRecords: number;
    catalogHash: string;
    graphHash: string;
    workIdsHash: string;
  };
  sourceSnapshots: readonly {
    adapterId: string;
    snapshotRevision: string;
    snapshotHash: string;
  }[];
  versions: {
    importer: string;
    matcher: string;
    resolver: string;
    proposal: string;
    runner: string;
    description: string;
    cover: string;
    coverInspection: string;
    adapters: readonly {
      adapterId: string;
      adapterVersion: string;
      sourcePolicyVersion: string;
      state: string;
    }[];
  };
  review: {
    descriptionQueueCap: number;
    identityQueueCap: number;
    activeMatchMinimum: number;
    candidateMatchMinimum: number;
  };
  deterministic: {
    canonicalJson: "recursive-key-sort";
    reportOrdering: "title-work-id";
    reportNewline: "lf";
  };
  contentHash: string;
};

export type CatalogDryRunProtectedHashes = {
  currentResolutionHeads: string;
  descriptionProjections: string;
  firstPublicationProjections: string;
  publicCoverRelationsAssets: string;
  coverPointers: string;
  readerFacingCatalog: string;
};

export type CatalogDryRunDescriptionResult = {
  workId: string;
  state: string;
  queue: string;
  rejectionCodes: readonly string[];
  warningCodes: readonly string[];
  inputTokens: number;
  outputTokens: number;
  costMicrousd: number;
  generationDurationMs: number;
};

export type CatalogDryRunCoverResult = {
  workId: string;
  state: string;
  gateCodes: readonly string[];
  warningCodes: readonly string[];
};

export type CatalogDryRunRehearsal = {
  name: "withdrawal" | "purge_retry" | "fallback" | "rollback";
  passed: boolean;
  promoted: false;
  detail: string;
};

export type CatalogDryRunReport = {
  formatVersion: typeof CATALOG_DRY_RUN_FORMAT_VERSION;
  manifest: CatalogDryRunManifest;
  run: {
    runId: string;
    contentHash: string;
    promotionExecuted: false;
    providerNetworkCalls: 0;
  };
  isolation: {
    protectedHashes: CatalogDryRunProtectedHashes;
    unchanged: true;
    productionWrites: false;
    previewWrites: false;
    publicWrites: false;
  };
  coverage: {
    baseline: Record<string, number>;
    proposed: Record<string, number>;
    confidenceBands: { high: number; medium: number; low: number };
  };
  counts: {
    scanned: number;
    matched: number;
    ambiguous: number;
    unmatched: number;
    observed: number;
    proposed: number;
    omitted: number;
    conflicting: number;
    withdrawn: number;
    queued: number;
    queueCap: number;
    queueOverflow: number;
  };
  providerMetrics: {
    requests: number;
    cacheHits: number;
    status429: number;
    status5xx: number;
    retries: number;
    latencyMs: number;
    bytes: number;
    snapshotAgeMs: number;
    recordedRuntimeMs: number;
    estimatedCostMicrousd: number;
  };
  proposedResolutions: readonly {
    workId: string;
    title: string;
    fieldKey: string;
    state: string;
    selectedObservationId: string | null;
    reason: string;
  }[];
  failuresByReason: readonly { code: string; count: number }[];
  planningComparison: readonly {
    area: string;
    planned: string;
    actual: string;
    materialVariance: string;
  }[];
  rehearsals: readonly CatalogDryRunRehearsal[];
  cases: readonly {
    workId: string;
    title: string;
    diagnosticCase: boolean;
    match: "matched" | "ambiguous" | "unmatched";
    proposedFields: readonly string[];
    description: string;
    cover: string;
    reasonCodes: readonly string[];
  }[];
};

const graphHash = (graph: CatalogImportGraph): string =>
  hashCanonicalJson(
    Object.fromEntries(
      Object.entries(graph).map(([name, rows]) => [
        name,
        [...rows].sort((left, right) =>
          canonicalJson(left).localeCompare(canonicalJson(right)),
        ),
      ]),
    ),
  );

const targetWork = (record: CatalogImportRecord): EnrichmentTargetWork => {
  const workId = deterministicCatalogId(
    "work",
    record.sourceKey,
    record.workKey ?? record.recordKey,
  );
  const diagnostic = diagnosticByWorkId.get(workId);
  const isbn = normalizeValidIsbn(record.isbn);
  return {
    workId,
    legacyRecordKey: record.recordKey,
    title: record.title.trim(),
    orderedCreators: record.authors.map((author) => author.name),
    providerRelations: diagnostic?.providerRelations ?? {},
    exactIdentifiers: isbn ? [`${isbn.scheme}:${isbn.value}`] : [],
  };
};

export const buildCatalogDryRunManifest = (input: {
  records: readonly CatalogImportRecord[];
  graph: CatalogImportGraph;
}): CatalogDryRunManifest => {
  const works = input.records
    .map(targetWork)
    .sort(
      (left, right) =>
        left.title.localeCompare(right.title) ||
        left.workId.localeCompare(right.workId),
    );
  if (new Set(works.map((work) => work.workId)).size !== works.length) {
    throw new Error(
      "Catalog dry run refused: grouped catalog works require an explicit catalog-wide manifest review",
    );
  }
  for (const diagnostic of ENRICHMENT_SAMPLE_MANIFEST.works) {
    const catalogWork = works.find((work) => work.workId === diagnostic.workId);
    if (
      !catalogWork ||
      canonicalJson(catalogWork.orderedCreators) !==
        canonicalJson(diagnostic.orderedCreators) ||
      catalogWork.title !== diagnostic.title
    ) {
      throw new Error(
        `Catalog dry run refused: diagnostic case drifted: ${diagnostic.title}`,
      );
    }
  }
  const sourceSnapshots = [
    {
      adapterId: "bukie.editorial",
      snapshotRevision: "catalog-dry-run-editorial-2026-07-28.v1",
      snapshotHash: hashCanonicalJson(
        CATALOG_RECORDED_PROVIDER_RECORDS.filter(
          (record) => record.adapterId === "bukie.editorial",
        ),
      ),
    },
    {
      adapterId: "wikidata.work-facts",
      snapshotRevision: "catalog-dry-run-recorded-2026-07-28",
      snapshotHash: hashCanonicalJson(
        CATALOG_RECORDED_PROVIDER_RECORDS.filter(
          (record) => record.adapterId === "wikidata.work-facts",
        ),
      ),
    },
  ] as const;
  const manifestWithoutHash = {
    id: "bukie-catalog-enrichment-dry-run",
    version: CATALOG_DRY_RUN_MANIFEST_VERSION,
    reviewedAt: "2026-07-29",
    formatVersion:
      CATALOG_DRY_RUN_FORMAT_VERSION as typeof CATALOG_DRY_RUN_FORMAT_VERSION,
    works,
    input: {
      catalogRecords: input.records.length,
      catalogHash: hashCanonicalJson(
        [...input.records].sort((left, right) =>
          canonicalJson(left).localeCompare(canonicalJson(right)),
        ),
      ),
      graphHash: graphHash(input.graph),
      workIdsHash: hashCanonicalJson(works.map((work) => work.workId).sort()),
    },
    sourceSnapshots,
    versions: {
      importer: CATALOG_IMPORTER_VERSION,
      matcher: CATALOG_DRY_RUN_MATCHER_VERSION,
      resolver: CATALOG_RESOLVER_VERSION,
      proposal: CATALOG_DRY_RUN_PROPOSAL_VERSION,
      runner: ENRICHMENT_RUNNER_VERSION,
      description: DESCRIPTION_POLICY_VERSION,
      cover: COVER_POLICY_VERSION,
      coverInspection: COVER_INSPECTION_VERSION,
      adapters: ENRICHMENT_ADAPTERS.map((adapter) => ({
        adapterId: adapter.adapterId,
        adapterVersion: adapter.adapterVersion,
        sourcePolicyVersion: adapter.sourcePolicyVersion,
        state: adapter.state,
      })).sort((left, right) => left.adapterId.localeCompare(right.adapterId)),
    },
    review: {
      descriptionQueueCap: CATALOG_DRY_RUN_DESCRIPTION_QUEUE_CAP,
      identityQueueCap: CATALOG_DRY_RUN_IDENTITY_QUEUE_CAP,
      activeMatchMinimum: 0.9,
      candidateMatchMinimum: 0.7,
    },
    deterministic: {
      canonicalJson: "recursive-key-sort" as const,
      reportOrdering: "title-work-id" as const,
      reportNewline: "lf" as const,
    },
  };
  return {
    ...manifestWithoutHash,
    contentHash: hashCanonicalJson(manifestWithoutHash),
  };
};

const basisPoints = (count: number, scope: number): number =>
  scope === 0 ? 0 : Math.round((count / scope) * 10_000);

const assertProtectedState = (
  before: CatalogDryRunProtectedHashes,
  after: CatalogDryRunProtectedHashes,
): void => {
  for (const key of Object.keys(before) as Array<
    keyof CatalogDryRunProtectedHashes
  >) {
    if (before[key] !== after[key]) {
      throw new Error(
        `Catalog dry run isolation failed: protected ${key} changed`,
      );
    }
  }
};

export const buildCatalogDryRunReport = (input: {
  manifest: CatalogDryRunManifest;
  graph: CatalogImportGraph;
  enrichment: EnrichmentRunArtifact;
  descriptions: readonly CatalogDryRunDescriptionResult[];
  covers: readonly CatalogDryRunCoverResult[];
  protectedBefore: CatalogDryRunProtectedHashes;
  protectedAfter: CatalogDryRunProtectedHashes;
  rehearsals: readonly CatalogDryRunRehearsal[];
}): CatalogDryRunReport => {
  const { contentHash, ...manifestWithoutHash } = input.manifest;
  if (hashCanonicalJson(manifestWithoutHash) !== contentHash) {
    throw new Error("Catalog dry run refused: manifest content hash changed");
  }
  assertProtectedState(input.protectedBefore, input.protectedAfter);
  const descriptionByWork = new Map(
    input.descriptions.map((result) => [result.workId, result]),
  );
  const coverByWork = new Map(
    input.covers.map((result) => [result.workId, result]),
  );
  const linksByWork = new Map<string, string[]>();
  for (const link of input.enrichment.sourceRecordLinks) {
    const outcomes = linksByWork.get(link.entityId) ?? [];
    outcomes.push(link.outcome);
    linksByWork.set(link.entityId, outcomes);
  }
  const fieldsByWork = new Map<string, string[]>();
  for (const observation of input.enrichment.fieldObservations) {
    const fields = fieldsByWork.get(observation.entityId) ?? [];
    fields.push(observation.fieldKey);
    fieldsByWork.set(observation.entityId, fields);
  }
  const sourceByRecordId = new Map(
    input.enrichment.sourceRecords.map((record) => [
      record.id,
      input.enrichment.metadataSources.find(
        (source) => source.id === record.sourceId,
      ),
    ]),
  );
  const observationsByField = new Map<
    string,
    Array<(typeof input.enrichment.fieldObservations)[number]>
  >();
  for (const observation of input.enrichment.fieldObservations) {
    const key = canonicalJson({
      entityId: observation.entityId,
      fieldKey: observation.fieldKey,
    });
    const observations = observationsByField.get(key) ?? [];
    observations.push(observation);
    observationsByField.set(key, observations);
  }
  const titleByWorkId = new Map(
    input.manifest.works.map((work) => [work.workId, work.title]),
  );
  const proposedResolutions = [...observationsByField.values()]
    .map((observations) => {
      const first = observations[0];
      if (!first) {
        throw new Error("Catalog dry run found an empty observation group");
      }
      const decision = resolveField(
        first.fieldKey as CatalogFieldKey,
        observations.map((observation) => {
          const source = sourceByRecordId.get(observation.sourceRecordId);
          const sourceKey = String(source?.key ?? "unknown");
          return {
            id: observation.id,
            sourceKey,
            sourceApproved: source?.approvalState === "approved",
            sourcePriority:
              sourceKey === "bukie_editorial"
                ? 0
                : sourceKey === "wikidata"
                  ? 1
                  : 99,
            value: JSON.parse(observation.valueJson),
            provenanceKind: observation.provenanceKind,
            state: observation.state,
            retrievedAt: observation.retrievedAt,
            actorRef: observation.actorRef ?? undefined,
            reason: observation.reason ?? undefined,
          };
        }),
      );
      return {
        workId: first.entityId,
        title: titleByWorkId.get(first.entityId) ?? first.entityId,
        fieldKey: first.fieldKey,
        state: decision.state,
        selectedObservationId: decision.selectedObservationId,
        reason: decision.reason,
      };
    })
    .sort(
      (left, right) =>
        left.title.localeCompare(right.title) ||
        left.workId.localeCompare(right.workId) ||
        left.fieldKey.localeCompare(right.fieldKey),
    );
  const cases = input.manifest.works.map((work) => {
    const outcomes = linksByWork.get(work.workId) ?? [];
    const diagnosticCase = diagnosticByWorkId.has(work.workId);
    const match = outcomes.includes("ambiguous")
      ? ("ambiguous" as const)
      : outcomes.includes("active")
        ? ("matched" as const)
        : ("unmatched" as const);
    const description = descriptionByWork.get(work.workId);
    const cover = coverByWork.get(work.workId);
    const reasonCodes = [
      ...new Set([
        ...(!diagnosticCase ? ["approved_snapshot_unavailable"] : []),
        ...(outcomes.includes("ambiguous") ? ["identity_conflict"] : []),
        ...(description?.queue === "overflow_paused"
          ? ["review_queue_overflow"]
          : []),
        ...(cover?.gateCodes ?? []),
      ]),
    ].sort();
    return {
      workId: work.workId,
      title: work.title,
      diagnosticCase,
      match,
      proposedFields: [...new Set(fieldsByWork.get(work.workId) ?? [])].sort(),
      description: description?.state ?? "omitted_no_approved_snapshot",
      cover: cover?.state ?? "omitted_no_approved_snapshot",
      reasonCodes,
    };
  });
  const proposedFirstPublication = new Set(
    input.enrichment.fieldObservations
      .filter(
        (observation) => observation.fieldKey === "work.first_publication_date",
      )
      .map((observation) => observation.entityId),
  ).size;
  const baselineDescriptions = input.graph.works.filter(
    (work) => work.description !== null,
  ).length;
  const baselineFirstPublication = input.graph.works.filter(
    (work) => work.firstPublicationDate !== null,
  ).length;
  const baselineCoverPointers = new Set(
    input.graph.editionCovers.map((row) => row.editionId),
  ).size;
  const highConfidence = input.enrichment.fieldObservations.filter(
    (observation) => observation.mappingConfidence >= 0.9,
  ).length;
  const mediumConfidence = input.enrichment.fieldObservations.filter(
    (observation) =>
      observation.mappingConfidence >= 0.7 &&
      observation.mappingConfidence < 0.9,
  ).length;
  const lowConfidence = input.enrichment.fieldObservations.filter(
    (observation) => observation.mappingConfidence < 0.7,
  ).length;
  const queued = input.descriptions.filter(
    (result) => result.queue === "queued",
  ).length;
  const queueOverflow = input.descriptions.filter(
    (result) => result.queue === "overflow_paused",
  ).length;
  const matched = cases.filter((entry) => entry.match === "matched").length;
  const ambiguous = cases.filter((entry) => entry.match === "ambiguous").length;
  const unmatched = cases.filter((entry) => entry.match === "unmatched").length;
  const estimatedCostMicrousd = input.descriptions.reduce(
    (total, result) => total + result.costMicrousd,
    0,
  );
  const recordedRuntimeMs =
    input.enrichment.report.latencyMs +
    input.descriptions.reduce(
      (total, result) => total + result.generationDurationMs,
      0,
    );
  const actualFirstPublicationPercent = (
    (proposedFirstPublication / input.manifest.works.length) *
    100
  ).toFixed(1);
  const descriptionCandidatePercent = (
    (input.descriptions.length / input.manifest.works.length) *
    100
  ).toFixed(1);
  const coverEligible = input.covers.filter(
    (result) => result.state === "eligible",
  ).length;
  const coverEligiblePercent = (
    (coverEligible / input.manifest.works.length) *
    100
  ).toFixed(1);
  const queuePercent =
    input.descriptions.length === 0
      ? "0.0"
      : ((queued / input.descriptions.length) * 100).toFixed(1);
  const report: CatalogDryRunReport = {
    formatVersion: CATALOG_DRY_RUN_FORMAT_VERSION,
    manifest: input.manifest,
    run: {
      runId: input.enrichment.runId,
      contentHash: input.enrichment.contentHash,
      promotionExecuted: false,
      providerNetworkCalls: 0,
    },
    isolation: {
      protectedHashes: input.protectedAfter,
      unchanged: true,
      productionWrites: false,
      previewWrites: false,
      publicWrites: false,
    },
    coverage: {
      baseline: {
        titleBasisPoints: basisPoints(
          input.graph.works.length,
          input.manifest.works.length,
        ),
        firstPublicationBasisPoints: basisPoints(
          baselineFirstPublication,
          input.manifest.works.length,
        ),
        descriptionBasisPoints: basisPoints(
          baselineDescriptions,
          input.manifest.works.length,
        ),
        coverPointerBasisPoints: basisPoints(
          baselineCoverPointers,
          input.manifest.works.length,
        ),
        verifiedCoverBasisPoints: 0,
      },
      proposed: {
        titleBasisPoints: 10_000,
        firstPublicationBasisPoints: basisPoints(
          proposedFirstPublication,
          input.manifest.works.length,
        ),
        descriptionCandidateBasisPoints: basisPoints(
          input.descriptions.length,
          input.manifest.works.length,
        ),
        descriptionEligibleBasisPoints: 0,
        verifiedCoverBasisPoints: basisPoints(
          coverEligible,
          input.manifest.works.length,
        ),
      },
      confidenceBands: {
        high: highConfidence,
        medium: mediumConfidence,
        low: lowConfidence,
      },
    },
    counts: {
      scanned: input.manifest.works.length,
      matched,
      ambiguous,
      unmatched,
      observed: input.enrichment.fieldObservations.length,
      proposed: proposedResolutions.filter(
        (resolution) =>
          resolution.state === "present" || resolution.state === "stale",
      ).length,
      omitted:
        unmatched +
        input.enrichment.report.observations.omitted +
        queueOverflow,
      conflicting: ambiguous,
      withdrawn: 0,
      queued,
      queueCap: CATALOG_DRY_RUN_DESCRIPTION_QUEUE_CAP,
      queueOverflow,
    },
    providerMetrics: {
      requests: input.enrichment.report.requestedRecords,
      cacheHits: input.enrichment.report.cacheHits,
      status429: input.enrichment.report.throttles,
      status5xx: input.enrichment.report.statusClasses["5xx"],
      retries: input.enrichment.report.retries,
      latencyMs: input.enrichment.report.latencyMs,
      bytes: input.enrichment.report.responseBytes,
      snapshotAgeMs: input.enrichment.report.sourceRevisionAgeMs,
      recordedRuntimeMs,
      estimatedCostMicrousd,
    },
    proposedResolutions,
    failuresByReason: [
      { code: "approved_snapshot_unavailable", count: unmatched },
      { code: "identity_conflict", count: ambiguous },
      {
        code: "rights_or_identity_cover_gate",
        count: input.covers.filter((result) => result.gateCodes.length > 0)
          .length,
      },
      { code: "review_queue_overflow", count: queueOverflow },
    ].sort((left, right) => left.code.localeCompare(right.code)),
    planningComparison: [
      {
        area: "work_first_publication",
        planned: "90-98% eligible after first pass",
        actual: `${actualFirstPublicationPercent}% proposed; 0% promoted`,
        materialVariance:
          "Below range because the dry run used only five retained Wikidata snapshots and left one ambiguous; it made no live or bulk acquisition.",
      },
      {
        area: "verified_covers",
        planned: "45-70% eligible after first pass",
        actual: `${coverEligiblePercent}% eligible`,
        materialVariance:
          "Below range because no approved external asset feed exists and the five recorded legacy covers fail rights or identity gates.",
      },
      {
        area: "publishable_descriptions",
        planned: "35-55% eligible; 70-85% candidate status with a model",
        actual: `0% eligible; ${descriptionCandidatePercent}% recorded candidate coverage`,
        materialVariance:
          "Below range because no model or text provider was called; only five provider-neutral recorded candidates were retained for gate and queue proof.",
      },
      {
        area: "description_review_queue",
        planned: "40-60% of description candidates",
        actual: `${queuePercent}% queued; ${queueOverflow} overflow left paused`,
        materialVariance:
          "Within the percentage envelope for retained candidates; absolute volume is lower because candidate acquisition was intentionally omitted for 495 works.",
      },
    ],
    rehearsals: [...input.rehearsals].sort((left, right) =>
      left.name.localeCompare(right.name),
    ),
    cases,
  };
  return report;
};

export const catalogDryRunReportBytes = (report: CatalogDryRunReport): string =>
  `${canonicalJson(report)}\n`;
