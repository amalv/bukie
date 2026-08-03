import {
  canonicalJson,
  deterministicCatalogId,
  hashCanonicalJson,
} from "../identity";
import type { CatalogImportGraph } from "../importer";
import { sourcePolicyAllowsFieldDisplay } from "../policy-eligibility";
import {
  coverCandidateIdentity,
  coverInspectionIdentity,
} from "./covers/repository";
import {
  COVER_INSPECTION_VERSION,
  COVER_POLICY_VERSION,
  type CoverCandidateInput,
  type CoverFlagCode,
  type CoverInspection,
} from "./covers/types";
import { validateCoverCandidate } from "./covers/validation";

export const DIAGNOSTIC_FIVE_COVER_APPROVAL_ID =
  "github-issue-143-poc-cover-slice-v1";
export const DIAGNOSTIC_FIVE_COVER_MANIFEST_HASH =
  "9a8befefb07fe9b112c46cbacedab3d279bc0aa117019e4e63e3cef5b20cadd1";
export const POC_COVER_SOURCE_POLICY_VERSION =
  "poc-cover-source-allowlist-2026-07.v1";

const RETRIEVED_AT = Date.UTC(2026, 6, 29, 18, 45, 0);
const INSPECTED_AT = Date.UTC(2026, 6, 29, 18, 50, 0);
const REVIEWED_AT = Date.UTC(2026, 6, 29, 19, 0, 0);
const REVIEWER_REF = "review:github-issue-143";
const SOURCE_ID = deterministicCatalogId(
  "metadata_source",
  "promotion",
  POC_COVER_SOURCE_POLICY_VERSION,
);

export type CoverPromotionProposal = {
  proposalId: string;
  workId: string;
  title: string;
  representationType: "selected_edition" | "work_representative";
  identityMatchKind: "exact_isbn" | "provider_work_relation";
  editionIsbn13: string | null;
  provider:
    | "open_library"
    | "standard_ebooks"
    | "hachette"
    | "penguin_random_house";
  providerId: string;
  sourcePageUrl: string;
  sourceAssetUrl: string;
  sourceRevision: string;
  objectKey: string;
  original: {
    sha256: string;
    mediaType: string;
    bytes: number;
    width: number;
    height: number;
  };
  normalized: {
    sha256: string;
    bytes: number;
    width: number;
    height: number;
    flags: readonly CoverFlagCode[];
    qualityScore: number;
  };
};

export const APPROVED_COVER_PROMOTION_PROPOSALS = [
  {
    proposalId: "cover-proposal:issue-143:dune:open-library:284504",
    workId: "7adeda04-34e2-5a7d-a101-de0578138b29",
    title: "Dune",
    representationType: "selected_edition",
    identityMatchKind: "exact_isbn",
    editionIsbn13: "9780441172719",
    provider: "open_library",
    providerId: "OL7525230M:cover-284504",
    sourcePageUrl: "https://openlibrary.org/books/OL7525230M/Dune",
    sourceAssetUrl: "https://covers.openlibrary.org/b/id/284504-L.jpg",
    sourceRevision:
      "openlibrary:OL7525230M:cover-284504:25d3a3da55588154b22b3377d5d48d99e81c92ee340e7c0c40e6d1c50b9cef4c",
    objectKey: "/covers/issue-143-dune-open-library-284504.webp",
    original: {
      sha256:
        "25d3a3da55588154b22b3377d5d48d99e81c92ee340e7c0c40e6d1c50b9cef4c",
      mediaType: "image/jpeg",
      bytes: 13_497,
      width: 279,
      height: 475,
    },
    normalized: {
      sha256:
        "5a951aae181c2b6885126dc8e893088f7b9a11e54554db1ac4ad88950cf22c39",
      bytes: 7_804,
      width: 279,
      height: 475,
      flags: ["tiny_dimensions", "upscaling_risk"],
      qualityScore: 60,
    },
  },
  {
    proposalId: "cover-proposal:issue-143:moby-dick:standard-ebooks:f1bf2968",
    workId: "00a218bd-3005-59cd-9c23-13efb48abe5a",
    title: "Moby-Dick",
    representationType: "work_representative",
    identityMatchKind: "provider_work_relation",
    editionIsbn13: null,
    provider: "standard_ebooks",
    providerId:
      "standardebooks/herman-melville_moby-dick:git-blob-f1bf2968b5a1759e560fbbb15ff1ec2666a9473c",
    sourcePageUrl:
      "https://standardebooks.org/ebooks/herman-melville/moby-dick",
    sourceAssetUrl:
      "https://raw.githubusercontent.com/standardebooks/herman-melville_moby-dick/master/src/epub/images/cover.svg",
    sourceRevision:
      "git-blob:f1bf2968b5a1759e560fbbb15ff1ec2666a9473c:3a1755a68252a8c0bb923527959911ab632917767b513a10b6927ac558483828",
    objectKey: "/covers/issue-143-moby-dick-standard-ebooks.webp",
    original: {
      sha256:
        "3a1755a68252a8c0bb923527959911ab632917767b513a10b6927ac558483828",
      mediaType: "image/svg+xml",
      bytes: 976_407,
      width: 1_400,
      height: 2_100,
    },
    normalized: {
      sha256:
        "11ac148d5ae59096096a6b14b9e11ef1c280be98d403007e5128660460227075",
      bytes: 62_466,
      width: 450,
      height: 675,
      flags: [],
      qualityScore: 100,
    },
  },
  {
    proposalId: "cover-proposal:issue-143:city-stars:hachette:9781857987638",
    workId: "00a01d7f-3f29-5c95-a292-c70a4e5dbb4f",
    title: "The City and the Stars",
    representationType: "work_representative",
    identityMatchKind: "provider_work_relation",
    editionIsbn13: null,
    provider: "hachette",
    providerId: "isbn13:9781857987638",
    sourcePageUrl:
      "https://www.hachette.co.uk/titles/arthur-c-clarke/the-city-and-the-stars/9781857987638/",
    sourceAssetUrl:
      "https://www.hachette.co.uk/wp-content/uploads/2018/07/hbg-title-the-city-and-the-stars-2-265.jpg?w=439",
    sourceRevision:
      "hachette:isbn13-9781857987638:19283f0bfa14b2902fedf9cd804a0fa3327c4e743a44588a89abb109970cd85e",
    objectKey: "/covers/issue-143-city-stars-hachette-9781857987638.webp",
    original: {
      sha256:
        "19283f0bfa14b2902fedf9cd804a0fa3327c4e743a44588a89abb109970cd85e",
      mediaType: "image/jpeg",
      bytes: 98_364,
      width: 439,
      height: 674,
    },
    normalized: {
      sha256:
        "a00446f23e662c00e95e3094373c3b1609d9e39140a23d07d84058a003d5ce15",
      bytes: 61_194,
      width: 439,
      height: 674,
      flags: ["upscaling_risk"],
      qualityScore: 90,
    },
  },
  {
    proposalId: "cover-proposal:issue-143:born-a-crime:prh:9780399588198",
    workId: "03ac5ae7-dcf1-5fe7-b6ac-b8f171459fb3",
    title: "Born a Crime",
    representationType: "work_representative",
    identityMatchKind: "provider_work_relation",
    editionIsbn13: null,
    provider: "penguin_random_house",
    providerId: "isbn13:9780399588198",
    sourcePageUrl:
      "https://www.penguinrandomhouse.com/books/537515/born-a-crime-by-trevor-noah/",
    sourceAssetUrl:
      "https://images3.penguinrandomhouse.com/cover/9780399588198",
    sourceRevision:
      "prh:isbn13-9780399588198:3b01e2d15fcf1301d6c867b6ef6ea1c0d9cc0b8671e4e792707c8b0dba168d7f",
    objectKey: "/covers/issue-143-born-crime-prh-9780399588198.webp",
    original: {
      sha256:
        "3b01e2d15fcf1301d6c867b6ef6ea1c0d9cc0b8671e4e792707c8b0dba168d7f",
      mediaType: "image/jpeg",
      bytes: 53_305,
      width: 295,
      height: 450,
    },
    normalized: {
      sha256:
        "21a7dacc31a0af9fb736e6e7ea5df6798170dc5800f313e7fe6791c6f243d0e1",
      bytes: 29_294,
      width: 295,
      height: 450,
      flags: ["tiny_dimensions", "upscaling_risk"],
      qualityScore: 60,
    },
  },
  {
    proposalId: "cover-proposal:issue-143:faithful-place:prh:9780143119494",
    workId: "0100088c-3aca-5e52-9e7a-fb89192e9248",
    title: "Faithful Place",
    representationType: "work_representative",
    identityMatchKind: "provider_work_relation",
    editionIsbn13: null,
    provider: "penguin_random_house",
    providerId: "isbn13:9780143119494",
    sourcePageUrl:
      "https://www.penguinrandomhouse.com/books/304337/faithful-place-by-tana-french/",
    sourceAssetUrl:
      "https://images2.penguinrandomhouse.com/cover/9780143119494",
    sourceRevision:
      "prh:isbn13-9780143119494:e7603c3ea8e6eba5514c22da6f6beb1145dc59deeaeeca605173fc44e165cc28",
    objectKey: "/covers/issue-143-faithful-place-prh-9780143119494.webp",
    original: {
      sha256:
        "e7603c3ea8e6eba5514c22da6f6beb1145dc59deeaeeca605173fc44e165cc28",
      mediaType: "image/jpeg",
      bytes: 36_413,
      width: 293,
      height: 450,
    },
    normalized: {
      sha256:
        "2348be09461e87d00242ffaa70ffa84f8ddd2e898583b23908b8d7dc5ff0ad11",
      bytes: 19_832,
      width: 293,
      height: 450,
      flags: ["tiny_dimensions", "upscaling_risk"],
      qualityScore: 60,
    },
  },
] as const satisfies readonly CoverPromotionProposal[];

export const APPROVED_COVER_PROPOSAL_IDS =
  APPROVED_COVER_PROMOTION_PROPOSALS.map((proposal) => proposal.proposalId);

export const POC_COVER_SOURCE_ALLOWLIST = {
  open_library: ["openlibrary.org", "covers.openlibrary.org"],
  standard_ebooks: [
    "standardebooks.org",
    "github.com",
    "raw.githubusercontent.com",
  ],
  hachette: ["www.hachette.co.uk"],
  penguin_random_house: [
    "www.penguinrandomhouse.com",
    "images2.penguinrandomhouse.com",
    "images3.penguinrandomhouse.com",
  ],
} as const;

const metadataPolicy = canonicalJson({
  display: false,
  proposedEvidenceOnly: false,
  sourcePolicyVersion: POC_COVER_SOURCE_POLICY_VERSION,
});

const assetPolicy = canonicalJson({
  attribution: { required: true },
  cache: true,
  display: true,
  fieldPermission: {
    allowedFields: ["edition.covers", "work.covers"],
    cache: true,
    display: true,
    fetch: true,
    transform: true,
  },
  pocRights: {
    decisionRef: "github-issue-143",
    mandatoryReviewBefore: "definitive_production_launch",
    rightsCleared: false,
    rightsStatus: "deferred_poc",
  },
  proposedEvidenceOnly: false,
  purgeOnWithdrawal: true,
  sourcePolicyVersion: POC_COVER_SOURCE_POLICY_VERSION,
  transform: true,
});

export const assertExactCoverProposalAllowlist = (
  proposalIds: readonly string[],
): void => {
  const requested = [...new Set(proposalIds)].sort();
  const approved = [...APPROVED_COVER_PROPOSAL_IDS].sort();
  if (canonicalJson(requested) !== canonicalJson(approved)) {
    throw new Error(
      "Catalog cover promotion refused: proposal allow-list is not the exact approved set",
    );
  }
};

export const verifyApprovedCoverManifest = (input: {
  approvalId: string;
  proposals: readonly CoverPromotionProposal[];
  proposalIds: readonly string[];
}): void => {
  if (input.approvalId !== DIAGNOSTIC_FIVE_COVER_APPROVAL_ID) {
    throw new Error(
      "Catalog cover promotion refused: approval ID is not exact",
    );
  }
  assertExactCoverProposalAllowlist(input.proposalIds);
  if (
    hashCanonicalJson(input.proposals) !== DIAGNOSTIC_FIVE_COVER_MANIFEST_HASH
  ) {
    throw new Error("Catalog cover promotion refused: manifest hash is stale");
  }
};

export const assertApprovedCoverManifest = (): void =>
  verifyApprovedCoverManifest({
    approvalId: DIAGNOSTIC_FIVE_COVER_APPROVAL_ID,
    proposals: APPROVED_COVER_PROMOTION_PROPOSALS,
    proposalIds: APPROVED_COVER_PROPOSAL_IDS,
  });

const sourceRecordId = (proposal: CoverPromotionProposal): string =>
  deterministicCatalogId(
    "source_record",
    POC_COVER_SOURCE_POLICY_VERSION,
    proposal.proposalId,
  );

const inspectionFor = (proposal: CoverPromotionProposal): CoverInspection => ({
  mediaType: "image/webp",
  byteSize: proposal.normalized.bytes,
  width: proposal.normalized.width,
  height: proposal.normalized.height,
  aspectRatio: proposal.normalized.width / proposal.normalized.height,
  checksum: proposal.normalized.sha256,
  decodeResult: "decoded",
  flags: [...proposal.normalized.flags],
  qualityScore: proposal.normalized.qualityScore,
  inspectionVersion: COVER_INSPECTION_VERSION,
  inspectedAt: INSPECTED_AT,
});

const candidateFor = (
  proposal: CoverPromotionProposal,
  editionId: string | null,
): CoverCandidateInput => ({
  workId: proposal.workId,
  editionId,
  sourceRecordId: sourceRecordId(proposal),
  representationType: proposal.representationType,
  identityMatchKind: proposal.identityMatchKind,
  identityEvidence: {
    decisionRef: "github-issue-143",
    editionIsbn13: proposal.editionIsbn13,
    provider: proposal.provider,
    providerId: proposal.providerId,
    rightsCleared: false,
    rightsStatus: "deferred_poc",
    sourcePageUrl: proposal.sourcePageUrl,
    mandatoryReviewBefore: "definitive_production_launch",
  },
  permissionState: "pending",
  rightsBasis: null,
  attributionText: `${proposal.title} cover source: ${proposal.provider}`,
  attributionUrl: proposal.sourcePageUrl,
  sourceUrl: proposal.sourceAssetUrl,
  sourceRevision: proposal.sourceRevision,
  sourcePolicyVersion: POC_COVER_SOURCE_POLICY_VERSION,
  objectKey: proposal.objectKey,
  transformationHistory: [
    {
      operation: "provider_asset_retrieval",
      version: "issue-143.v1",
      parameters: {
        originalBytes: proposal.original.bytes,
        originalSha256: proposal.original.sha256,
      },
    },
    {
      operation: "sharp_webp",
      version: "0.34.5",
      parameters: {
        effort: 4,
        quality: 80,
        withoutEnlargement: true,
      },
    },
  ],
  createdAt: RETRIEVED_AT,
});

const decisionId = (
  candidateId: string,
  phase: "inspection" | "review",
  previousDecisionId: string | null,
): string =>
  deterministicCatalogId(
    "cover_decision",
    candidateId,
    hashCanonicalJson({
      phase,
      policyVersion: COVER_POLICY_VERSION,
      previousDecisionId,
    }),
  );

const projectionId = (
  workId: string,
  state: "placeholder" | "selected",
  candidateId: string | null,
  previousProjectionId: string | null,
): string =>
  deterministicCatalogId(
    "cover_projection",
    workId,
    hashCanonicalJson({
      candidateId,
      policyVersion: COVER_POLICY_VERSION,
      previousProjectionId,
      state,
    }),
  );

type CoverPromotionCatalog = Pick<
  CatalogImportGraph,
  "works" | "editions" | "editionIdentifiers"
>;

export const diagnosticFiveCoverRows = (graph: CoverPromotionCatalog) => {
  assertApprovedCoverManifest();
  assertExactCoverProposalAllowlist(APPROVED_COVER_PROPOSAL_IDS);
  const metadataSource = {
    id: SOURCE_ID,
    key: "poc_reviewed_cover_sources_issue_143",
    name: "Reviewed PoC cover sources for issue #143",
    termsUrl: null,
    attributionUrl: null,
    reviewedAt: REVIEWED_AT,
    approvalState: "approved",
    metadataPolicy,
    assetPolicy,
    payloadPolicy: "full",
    refreshIntervalMs: null,
  };
  const entries = APPROVED_COVER_PROMOTION_PROPOSALS.map((proposal) => {
    const work = graph.works.find((row) => row.id === proposal.workId);
    if (!work || work.preferredTitle !== proposal.title) {
      throw new Error(
        `Catalog cover promotion refused: work identity drifted for ${proposal.title}`,
      );
    }
    const editionId =
      proposal.representationType === "selected_edition"
        ? String(work.preferredEditionId)
        : null;
    if (proposal.editionIsbn13) {
      const exactIdentifier = graph.editionIdentifiers.some(
        (row) =>
          row.editionId === editionId &&
          row.scheme === "isbn13" &&
          row.valueNormalized === proposal.editionIsbn13,
      );
      if (!exactIdentifier) {
        throw new Error(
          `Catalog cover promotion refused: edition identity drifted for ${proposal.title}`,
        );
      }
    }
    const candidate = candidateFor(proposal, editionId);
    const inspection = inspectionFor(proposal);
    const candidateId = coverCandidateIdentity(candidate);
    const inspectionId = coverInspectionIdentity(candidateId, inspection);
    const automaticDecisionId = decisionId(candidateId, "inspection", null);
    const reviewedDecisionId = decisionId(
      candidateId,
      "review",
      automaticDecisionId,
    );
    const baselineProjectionId = projectionId(
      proposal.workId,
      "placeholder",
      null,
      null,
    );
    const selectedProjectionId = projectionId(
      proposal.workId,
      "selected",
      candidateId,
      baselineProjectionId,
    );
    const payload = {
      approvalId: DIAGNOSTIC_FIVE_COVER_APPROVAL_ID,
      approvedManifestHash: DIAGNOSTIC_FIVE_COVER_MANIFEST_HASH,
      proposal,
      rightsCleared: false,
      rightsStatus: "deferred_poc",
    };
    const recordId = sourceRecordId(proposal);
    return {
      proposal,
      candidate,
      inspection,
      sourceRecord: {
        id: recordId,
        sourceId: SOURCE_ID,
        recordKey: proposal.providerId,
        sourceRevision: proposal.sourceRevision,
        sourceModifiedAt: null,
        retrievedAt: RETRIEVED_AT,
        payloadJson: canonicalJson(payload),
        payloadHash: hashCanonicalJson(payload),
        importerVersion: COVER_POLICY_VERSION,
        sourceRowHash: hashCanonicalJson(payload),
        state: "active",
      },
      sourceRecordLink: {
        sourceRecordId: recordId,
        entityType:
          proposal.representationType === "selected_edition"
            ? "edition"
            : "work",
        entityId: editionId ?? proposal.workId,
        matchKind:
          proposal.identityMatchKind === "exact_isbn"
            ? "exact_identifier"
            : "source_relationship",
        mappingConfidence: 1,
        state: "active",
        actorRef: REVIEWER_REF,
        reason: `Reviewed ${proposal.provider} ${proposal.representationType} identity`,
        createdAt: REVIEWED_AT,
      },
      coverAsset: {
        id: deterministicCatalogId(
          "cover_asset",
          POC_COVER_SOURCE_POLICY_VERSION,
          proposal.normalized.sha256,
        ),
        objectKey: proposal.objectKey,
        mediaType: "image/webp",
        width: proposal.normalized.width,
        height: proposal.normalized.height,
        bytes: proposal.normalized.bytes,
        checksum: proposal.normalized.sha256,
        state: "available",
        sourcePolicyId: SOURCE_ID,
      },
      coverCandidate: {
        id: candidateId,
        workId: candidate.workId,
        editionId: candidate.editionId,
        sourceRecordId: candidate.sourceRecordId,
        representationType: candidate.representationType,
        identityMatchKind: candidate.identityMatchKind,
        identityEvidenceJson: canonicalJson(candidate.identityEvidence),
        permissionState: candidate.permissionState,
        rightsBasis: candidate.rightsBasis,
        attributionText: candidate.attributionText,
        attributionUrl: candidate.attributionUrl,
        sourceUrl: candidate.sourceUrl,
        sourceRevision: candidate.sourceRevision,
        sourcePolicyVersion: candidate.sourcePolicyVersion,
        objectKey: candidate.objectKey,
        transformationHistoryJson: canonicalJson(
          candidate.transformationHistory,
        ),
        createdAt: candidate.createdAt,
      },
      coverInspection: {
        id: inspectionId,
        candidateId,
        mediaType: inspection.mediaType,
        byteSize: inspection.byteSize,
        width: inspection.width,
        height: inspection.height,
        aspectRatio: inspection.aspectRatio,
        checksum: inspection.checksum,
        decodeResult: inspection.decodeResult,
        flagsJson: canonicalJson(inspection.flags),
        qualityScore: inspection.qualityScore,
        duplicateOfCandidateId: null,
        inspectionVersion: inspection.inspectionVersion,
        inspectedAt: inspection.inspectedAt,
      },
      coverDecisions: [
        {
          id: automaticDecisionId,
          candidateId,
          inspectionId,
          state: inspection.flags.length === 0 ? "eligible" : "review_required",
          gateCodesJson: canonicalJson([]),
          warningCodesJson: canonicalJson(inspection.flags),
          reviewerRef: null,
          reviewReason: null,
          purgeState: "not_required",
          previousDecisionId: null,
          policyVersion: COVER_POLICY_VERSION,
          decidedAt: INSPECTED_AT,
        },
        {
          id: reviewedDecisionId,
          candidateId,
          inspectionId,
          state: "eligible",
          gateCodesJson: canonicalJson([]),
          warningCodesJson: canonicalJson(inspection.flags),
          reviewerRef: REVIEWER_REF,
          reviewReason: `Approved ${proposal.representationType} cover; acknowledged: ${inspection.flags.join(", ") || "none"}; rights deferred for PoC by issue #143`,
          purgeState: "not_required",
          previousDecisionId: automaticDecisionId,
          policyVersion: COVER_POLICY_VERSION,
          decidedAt: REVIEWED_AT,
        },
      ],
      coverDecisionHead: {
        candidateId,
        decisionId: reviewedDecisionId,
      },
      coverProjections: [
        {
          id: baselineProjectionId,
          workId: proposal.workId,
          candidateId: null,
          state: "placeholder",
          previousProjectionId: null,
          reasonCode: "pre_issue_143_reviewed_cover",
          actorRef: "system:catalog-importer",
          policyVersion: COVER_POLICY_VERSION,
          projectedAt: RETRIEVED_AT,
        },
        {
          id: selectedProjectionId,
          workId: proposal.workId,
          candidateId,
          state: "selected",
          previousProjectionId: baselineProjectionId,
          reasonCode: "issue_143_review_approve",
          actorRef: REVIEWER_REF,
          policyVersion: COVER_POLICY_VERSION,
          projectedAt: REVIEWED_AT,
        },
      ],
      coverProjectionHead: {
        workId: proposal.workId,
        projectionId: selectedProjectionId,
      },
    };
  });
  return { metadataSource, entries };
};

export const assertDiagnosticFiveCoverEligibility = (
  graph: CoverPromotionCatalog,
  rows: ReturnType<typeof diagnosticFiveCoverRows>,
): void => {
  if (
    rows.metadataSource.approvalState !== "approved" ||
    !sourcePolicyAllowsFieldDisplay(
      rows.metadataSource.assetPolicy,
      "edition.covers",
    ) ||
    !sourcePolicyAllowsFieldDisplay(
      rows.metadataSource.assetPolicy,
      "work.covers",
    )
  ) {
    throw new Error("Catalog cover promotion refused: source policy drifted");
  }
  for (const entry of rows.entries) {
    const allowedHosts = new Set<string>(
      POC_COVER_SOURCE_ALLOWLIST[entry.proposal.provider],
    );
    if (
      !allowedHosts.has(new URL(entry.proposal.sourcePageUrl).hostname) ||
      !allowedHosts.has(new URL(entry.proposal.sourceAssetUrl).hostname) ||
      entry.candidate.permissionState !== "pending" ||
      entry.candidate.rightsBasis !== null ||
      entry.candidate.identityEvidence.rightsStatus !== "deferred_poc" ||
      entry.candidate.identityEvidence.rightsCleared !== false ||
      entry.inspection.qualityScore < 60 ||
      entry.inspection.decodeResult !== "decoded"
    ) {
      throw new Error(
        `Catalog cover promotion refused: source, rights, or quality drifted for ${entry.proposal.title}`,
      );
    }
    const validation = validateCoverCandidate({
      candidate: entry.candidate,
      inspection: entry.inspection,
      source: {
        sourceRevision: entry.sourceRecord.sourceRevision,
        sourceRecordState: "active",
        sourceApproval: "approved",
        sourceLinkState: "active",
        sourceLinkMatchKind:
          entry.sourceRecordLink.matchKind === "exact_identifier"
            ? "exact_identifier"
            : "source_relationship",
        metadataPolicy: rows.metadataSource.metadataPolicy,
        assetPolicy: rows.metadataSource.assetPolicy,
      },
      editionBelongsToWork:
        entry.candidate.editionId === null ||
        graph.editions.some(
          (edition) =>
            edition.id === entry.candidate.editionId &&
            edition.workId === entry.candidate.workId,
        ),
      identityEvidenceVerified: true,
    });
    if (validation.gateCodes.length > 0) {
      throw new Error(
        `Catalog cover promotion refused: eligibility drifted for ${entry.proposal.title}`,
      );
    }
  }
};

export const applyDiagnosticFiveCoverPromotionToGraph = (
  graph: CatalogImportGraph,
): void => {
  if (graph.works.length !== 500) return;
  const rows = diagnosticFiveCoverRows(graph);
  assertDiagnosticFiveCoverEligibility(graph, rows);
  graph.metadataSources.push(rows.metadataSource);
  for (const entry of rows.entries) {
    graph.sourceRecords.push(entry.sourceRecord);
    graph.sourceRecordLinks.push(entry.sourceRecordLink);
    graph.coverAssets.push(entry.coverAsset);
    graph.coverCandidates.push(entry.coverCandidate);
    graph.coverInspections.push(entry.coverInspection);
    graph.coverDecisions.push(...entry.coverDecisions);
    graph.coverDecisionHeads.push(entry.coverDecisionHead);
    graph.coverProjections.push(...entry.coverProjections);
    graph.coverProjectionHeads.push(entry.coverProjectionHead);
  }
};
