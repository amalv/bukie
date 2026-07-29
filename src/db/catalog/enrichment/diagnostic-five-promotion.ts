import { createHash } from "node:crypto";
import {
  canonicalJson,
  deterministicCatalogId,
  hashCanonicalJson,
} from "../identity";
import type { CatalogImportGraph } from "../importer";
import { normalizeSortText } from "../normalize";
import { sourcePolicyAllowsFieldDisplay } from "../policy-eligibility";
import { validateCatalogImportGraph } from "../validate-graph";

export const DIAGNOSTIC_FIVE_PROMOTION_VERSION =
  "diagnostic-five-first-publication-2026-07-29.v1";
export const DIAGNOSTIC_FIVE_PROMOTION_APPROVAL_ID =
  "github-issue-143-reviewed-slice-v1";
export const APPROVED_DRY_RUN_REPORT_SHA256 =
  "a85538c057e0b65696644e372f09f18a6da0daf0cefec0d42d641ee4ca6a1b0d";
export const APPROVED_DRY_RUN_MANIFEST_HASH =
  "7b7cc856a2c8e8a9aff35098491df49d8cce85c6a7f7639a0c4cecd25fcfa615";
export const APPROVED_DRY_RUN_CONTENT_HASH =
  "9b8e04b5cb005181b40e61b0185ed5a5d6b5d9eed902527b891e4d058baad5bd";

const PROMOTED_AT = Date.UTC(2026, 6, 29, 18, 0, 0);
const SOURCE_POLICY_VERSION =
  "wikidata-cc0-first-publication-reviewed-2026-07-29";
const SOURCE_ID = deterministicCatalogId(
  "metadata_source",
  "promotion",
  SOURCE_POLICY_VERSION,
);

export type ApprovedPromotionProposal = {
  proposalId: string;
  workId: string;
  title: string;
  providerWorkId: string;
  value: { date: string; precision: "year" };
  selectedDryRunObservationId: string;
  sourceRevision: string;
};

export const APPROVED_PROMOTION_PROPOSALS = [
  {
    proposalId:
      "proposal:b92631fa785ae1c1f4ec5a67ba12a6a0b6edcff3c5342a3defcf17156f0b1cf8",
    workId: "03ac5ae7-dcf1-5fe7-b6ac-b8f171459fb3",
    title: "Born a Crime",
    providerWorkId: "Q29831237",
    value: { date: "2016", precision: "year" },
    selectedDryRunObservationId: "88252688-cf38-574d-8f85-6e185fd30208",
    sourceRevision: "catalog-dry-run-recorded-2026-07-28:Q29831237",
  },
  {
    proposalId:
      "proposal:472c8cdf692aaa817240aa01d97a0203c82924ad61ff7c263e46486a1975a5eb",
    workId: "0100088c-3aca-5e52-9e7a-fb89192e9248",
    title: "Faithful Place",
    providerWorkId: "Q5431286",
    value: { date: "2010", precision: "year" },
    selectedDryRunObservationId: "b2d0f61d-0b95-5860-ab68-65174979585d",
    sourceRevision: "catalog-dry-run-recorded-2026-07-28:Q5431286",
  },
  {
    proposalId:
      "proposal:92a0e3302f5c49026fe159664609e895128226fb5e6a399a4214ca4ef0b732cb",
    workId: "00a218bd-3005-59cd-9c23-13efb48abe5a",
    title: "Moby-Dick",
    providerWorkId: "Q174596",
    value: { date: "1851", precision: "year" },
    selectedDryRunObservationId: "f0a6dcdb-fc4d-507a-83f1-1f4c49d6ddc8",
    sourceRevision: "catalog-dry-run-recorded-2026-07-28:Q174596",
  },
  {
    proposalId:
      "proposal:382f58212798f70a535d812336067d2a4f986cad8f310177c2332d89aea02bf0",
    workId: "00a01d7f-3f29-5c95-a292-c70a4e5dbb4f",
    title: "The City and the Stars",
    providerWorkId: "Q386544",
    value: { date: "1956", precision: "year" },
    selectedDryRunObservationId: "157693f1-d0d2-52cb-9519-387bea225573",
    sourceRevision: "catalog-dry-run-recorded-2026-07-28:Q386544",
  },
] as const satisfies readonly ApprovedPromotionProposal[];

export const DIAGNOSTIC_FIVE_PROMOTION_APPROVAL = {
  id: DIAGNOSTIC_FIVE_PROMOTION_APPROVAL_ID,
  issue: 143,
  approvedManifestHash: APPROVED_DRY_RUN_MANIFEST_HASH,
  approvedReportSha256: APPROVED_DRY_RUN_REPORT_SHA256,
  approvedRunContentHash: APPROVED_DRY_RUN_CONTENT_HASH,
  approvedProposalIds: APPROVED_PROMOTION_PROPOSALS.map(
    (proposal) => proposal.proposalId,
  ),
  repositoryInputApproved: true,
  productionDatabaseExecutionApproved: false,
  exclusions: {
    covers:
      "No candidate has both strong identity and display-rights evidence.",
    descriptions:
      "No candidate is review-eligible; queue overflow remains paused.",
    duneFirstPublication:
      "The recorded Wikidata work identity remains ambiguous.",
    preferredTitles:
      "The proposed values are identical to current projections and add no narrow-slice value.",
  },
} as const;

type DryRunProposal = {
  workId: string;
  title: string;
  fieldKey: string;
  state: string;
  selectedObservationId: string | null;
  reason: string;
};

type DryRunReport = {
  formatVersion: string;
  manifest: { contentHash: string };
  run: { contentHash: string; promotionExecuted: boolean };
  proposedResolutions: DryRunProposal[];
  cases: Array<{
    workId: string;
    title: string;
    match: string;
    description: string;
    cover: string;
  }>;
};

export const proposalId = (proposal: DryRunProposal): string =>
  `proposal:${hashCanonicalJson(proposal)}`;

export const assertApprovedPromotionReportContent = (
  report: DryRunReport,
): void => {
  if (
    report.manifest.contentHash !== APPROVED_DRY_RUN_MANIFEST_HASH ||
    report.run.contentHash !== APPROVED_DRY_RUN_CONTENT_HASH ||
    report.run.promotionExecuted
  ) {
    throw new Error(
      "Catalog promotion refused: manifest or isolated-run identity drifted",
    );
  }
  const byId = new Map(
    report.proposedResolutions.map((proposal) => [
      proposalId(proposal),
      proposal,
    ]),
  );
  for (const approved of APPROVED_PROMOTION_PROPOSALS) {
    const recorded = byId.get(approved.proposalId);
    if (
      !recorded ||
      recorded.workId !== approved.workId ||
      recorded.title !== approved.title ||
      recorded.fieldKey !== "work.first_publication_date" ||
      recorded.state !== "present" ||
      recorded.selectedObservationId !== approved.selectedDryRunObservationId
    ) {
      throw new Error(
        `Catalog promotion refused: approved proposal drifted for ${approved.title}`,
      );
    }
  }
  const dune = report.cases.find((entry) => entry.title === "Dune");
  if (!dune || dune.match !== "ambiguous") {
    throw new Error(
      "Catalog promotion refused: Dune ambiguity is no longer represented",
    );
  }
};

export const verifyApprovedPromotionReport = (
  reportBytes: Uint8Array,
  input: {
    approvalId: string;
    proposalIds: readonly string[];
  },
): DryRunReport => {
  if (input.approvalId !== DIAGNOSTIC_FIVE_PROMOTION_APPROVAL_ID) {
    throw new Error("Catalog promotion refused: approval ID is not exact");
  }
  const requestedIds = [...new Set(input.proposalIds)].sort();
  const approvedIds = DIAGNOSTIC_FIVE_PROMOTION_APPROVAL.approvedProposalIds
    .slice()
    .sort();
  if (canonicalJson(requestedIds) !== canonicalJson(approvedIds)) {
    throw new Error(
      "Catalog promotion refused: proposal allow-list is not the exact approved set",
    );
  }
  const reportHash = createHash("sha256").update(reportBytes).digest("hex");
  if (reportHash !== APPROVED_DRY_RUN_REPORT_SHA256) {
    throw new Error("Catalog promotion refused: dry-run report hash is stale");
  }
  const report = JSON.parse(
    Buffer.from(reportBytes).toString("utf8"),
  ) as DryRunReport;
  assertApprovedPromotionReportContent(report);
  return report;
};

const metadataPolicy = canonicalJson({
  acquisition: "retained_recorded_snapshot",
  attribution: {
    required: false,
    text: "Wikidata",
    url: "https://www.wikidata.org/",
  },
  display: true,
  fieldPermission: {
    allowedFields: ["work.first_publication_date"],
    cache: true,
    display: true,
    fetch: false,
    retain: "full",
    transform: true,
  },
  policySources: [
    "https://www.wikidata.org/wiki/Wikidata:Licensing",
    "https://www.wikidata.org/wiki/Wikidata:Data_access",
  ],
  proposedEvidenceOnly: false,
  sourcePolicyVersion: SOURCE_POLICY_VERSION,
  withdrawal: {
    recomputeProposals: true,
    tombstone: true,
  },
});

const assetPolicy = canonicalJson({
  display: false,
  fieldPermission: {
    allowedFields: [],
    cache: false,
    display: false,
    fetch: false,
    retain: "none",
    transform: false,
  },
  proposedEvidenceOnly: true,
  sourcePolicyVersion: SOURCE_POLICY_VERSION,
});

export type PromotionEvidenceRows = ReturnType<typeof promotionEvidenceRows>;

export const promotionEvidenceRows = () => {
  const metadataSource = {
    id: SOURCE_ID,
    key: "wikidata_reviewed_first_publication_issue_143",
    name: "Reviewed Wikidata first-publication evidence for issue #143",
    termsUrl: "https://www.wikidata.org/wiki/Wikidata:Licensing",
    attributionUrl: "https://www.wikidata.org/",
    reviewedAt: PROMOTED_AT,
    approvalState: "approved",
    metadataPolicy,
    assetPolicy,
    payloadPolicy: "full",
    refreshIntervalMs: null,
  };
  const entries = APPROVED_PROMOTION_PROPOSALS.map((proposal) => {
    const payload = {
      approvedManifestHash: APPROVED_DRY_RUN_MANIFEST_HASH,
      approvedReportSha256: APPROVED_DRY_RUN_REPORT_SHA256,
      approvedProposalId: proposal.proposalId,
      providerWorkId: proposal.providerWorkId,
      selectedDryRunObservationId: proposal.selectedDryRunObservationId,
      sourceRevision: proposal.sourceRevision,
      value: proposal.value,
    };
    const sourceRecordId = deterministicCatalogId(
      "source_record",
      SOURCE_POLICY_VERSION,
      proposal.providerWorkId,
    );
    const observationId = deterministicCatalogId(
      "field_observation",
      sourceRecordId,
      `work:${proposal.workId}:work.first_publication_date:${hashCanonicalJson(proposal.value)}`,
    );
    return {
      proposal,
      sourceRecord: {
        id: sourceRecordId,
        sourceId: SOURCE_ID,
        recordKey: proposal.providerWorkId,
        sourceRevision: proposal.sourceRevision,
        sourceModifiedAt: null,
        retrievedAt: PROMOTED_AT,
        payloadJson: canonicalJson(payload),
        payloadHash: hashCanonicalJson(payload),
        importerVersion: DIAGNOSTIC_FIVE_PROMOTION_VERSION,
        sourceRowHash: hashCanonicalJson(payload),
        state: "active",
      },
      sourceRecordLink: {
        sourceRecordId,
        entityType: "work",
        entityId: proposal.workId,
        matchKind: "source_relationship",
        mappingConfidence: 1,
        state: "active",
        actorRef: "review:github-issue-143",
        reason: `Reviewed provider-native work relation ${proposal.providerWorkId}`,
        createdAt: PROMOTED_AT,
      },
      fieldObservation: {
        id: observationId,
        sourceRecordId,
        entityType: "work",
        entityId: proposal.workId,
        fieldKey: "work.first_publication_date",
        valueJson: canonicalJson(proposal.value),
        comparisonHash: hashCanonicalJson(proposal.value),
        provenanceKind: "imported",
        sourcePath: "claims.P577.recordedValue",
        sourceModifiedAt: null,
        retrievedAt: PROMOTED_AT,
        mappingConfidence: 1,
        state: "active",
        actorRef: null,
        reason: null,
        derivationName: null,
        derivationVersion: null,
        parentIdsJson: null,
      },
    };
  });
  return { metadataSource, entries };
};

export const assertPromotionEvidenceEligibility = (
  rows: PromotionEvidenceRows,
): void => {
  if (
    rows.metadataSource.approvalState !== "approved" ||
    !sourcePolicyAllowsFieldDisplay(
      rows.metadataSource.metadataPolicy,
      "work.first_publication_date",
    ) ||
    sourcePolicyAllowsFieldDisplay(
      rows.metadataSource.assetPolicy,
      "edition.covers",
    )
  ) {
    throw new Error(
      "Catalog promotion refused: source or rights policy drifted",
    );
  }
  for (const entry of rows.entries) {
    if (
      entry.sourceRecord.state !== "active" ||
      entry.sourceRecord.sourceRevision !== entry.proposal.sourceRevision ||
      entry.sourceRecordLink.state !== "active" ||
      entry.sourceRecordLink.mappingConfidence !== 1 ||
      entry.sourceRecordLink.entityId !== entry.proposal.workId ||
      entry.fieldObservation.state !== "active" ||
      entry.fieldObservation.mappingConfidence !== 1 ||
      entry.fieldObservation.comparisonHash !==
        hashCanonicalJson(entry.proposal.value)
    ) {
      throw new Error(
        `Catalog promotion refused: eligibility drifted for ${entry.proposal.title}`,
      );
    }
  }
};

export const applyDiagnosticFivePromotionToGraph = (
  graph: CatalogImportGraph,
): void => {
  // This reviewed input belongs only to the complete deterministic artifact.
  // Small fixtures and isolated enrichment targets must remain pre-promotion.
  if (graph.works.length !== 500) return;
  const rows = promotionEvidenceRows();
  assertPromotionEvidenceEligibility(rows);
  const diagnosticWorks = new Map(
    graph.works
      .filter((work) =>
        [
          ...APPROVED_PROMOTION_PROPOSALS.map((proposal) => proposal.workId),
          "7adeda04-34e2-5a7d-a101-de0578138b29",
        ].includes(String(work.id)),
      )
      .map((work) => [String(work.id), work]),
  );
  if (diagnosticWorks.size !== 5) {
    throw new Error(
      "Catalog promotion refused: diagnostic-five scope is incomplete",
    );
  }
  graph.metadataSources.push(rows.metadataSource);
  for (const entry of rows.entries) {
    const work = diagnosticWorks.get(entry.proposal.workId);
    if (
      !work ||
      work.preferredTitle !== entry.proposal.title ||
      work.sortTitle !== normalizeSortText(entry.proposal.title) ||
      work.firstPublicationDate !== null
    ) {
      throw new Error(
        `Catalog promotion refused: deterministic input drifted for ${entry.proposal.title}`,
      );
    }
    let head = graph.fieldResolutionHeads.find(
      (candidate) =>
        candidate.entityType === "work" &&
        candidate.entityId === entry.proposal.workId &&
        candidate.fieldKey === "work.first_publication_date",
    );
    if (!head) {
      const priorResolutionId = deterministicCatalogId(
        "field_resolution",
        `${DIAGNOSTIC_FIVE_PROMOTION_VERSION}:baseline`,
        entry.proposal.workId,
      );
      graph.fieldResolutions.push({
        id: priorResolutionId,
        entityType: "work",
        entityId: entry.proposal.workId,
        fieldKey: "work.first_publication_date",
        selectedObservationId: null,
        state: "missing",
        reason: "No eligible approved observation before issue #143 promotion",
        previousResolutionId: null,
        actorRef: "system:catalog-importer",
        resolverVersion: `${DIAGNOSTIC_FIVE_PROMOTION_VERSION}:baseline`,
        resolvedAt: PROMOTED_AT,
      });
      head = {
        entityType: "work",
        entityId: entry.proposal.workId,
        fieldKey: "work.first_publication_date",
        resolutionId: priorResolutionId,
      };
      graph.fieldResolutionHeads.push(head);
    }
    const previous = graph.fieldResolutions.find(
      (candidate) => candidate.id === head?.resolutionId,
    );
    if (!head || !previous || previous.state !== "missing") {
      throw new Error(
        `Catalog promotion refused: prior head drifted for ${entry.proposal.title}`,
      );
    }
    graph.sourceRecords.push(entry.sourceRecord);
    graph.sourceRecordLinks.push(entry.sourceRecordLink);
    graph.fieldObservations.push(entry.fieldObservation);
    const resolutionId = deterministicCatalogId(
      "field_resolution",
      DIAGNOSTIC_FIVE_PROMOTION_VERSION,
      hashCanonicalJson({
        previousResolutionId: previous.id,
        proposalId: entry.proposal.proposalId,
        selectedObservationId: entry.fieldObservation.id,
      }),
    );
    graph.fieldResolutions.push({
      id: resolutionId,
      entityType: "work",
      entityId: entry.proposal.workId,
      fieldKey: "work.first_publication_date",
      selectedObservationId: entry.fieldObservation.id,
      state: "present",
      reason: `Explicitly reviewed issue #143 proposal ${entry.proposal.proposalId}`,
      previousResolutionId: previous.id,
      actorRef: "review:github-issue-143",
      resolverVersion: DIAGNOSTIC_FIVE_PROMOTION_VERSION,
      resolvedAt: PROMOTED_AT,
    });
    head.resolutionId = resolutionId;
    work.firstPublicationDate = entry.proposal.value.date;
    work.firstPublicationPrecision = entry.proposal.value.precision;
    work.firstPublicationSortDate = `${entry.proposal.value.date}-01-01`;
    work.updatedAt = PROMOTED_AT;
  }
  for (const key of Object.keys(graph) as Array<keyof CatalogImportGraph>) {
    graph[key].sort((left, right) =>
      canonicalJson(left).localeCompare(canonicalJson(right)),
    );
  }
  validateCatalogImportGraph(graph);
};
