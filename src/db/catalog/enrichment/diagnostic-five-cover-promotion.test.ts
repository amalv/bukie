import { describe, expect, it } from "vitest";
import baseCatalog from "../../../../artifacts/catalog";
import {
  buildCatalogImportGraph,
  legacyBooksToImportRecords,
} from "../importer";
import {
  APPROVED_COVER_PROMOTION_PROPOSALS,
  APPROVED_COVER_PROPOSAL_IDS,
  DIAGNOSTIC_FIVE_COVER_APPROVAL_ID,
  DIAGNOSTIC_FIVE_COVER_MANIFEST_HASH,
  verifyApprovedCoverManifest,
} from "./diagnostic-five-cover-promotion";

describe("diagnostic-five PoC cover promotion", () => {
  it("pins the exact reviewed manifest and explicit five-ID allow-list", () => {
    expect(() =>
      verifyApprovedCoverManifest({
        approvalId: DIAGNOSTIC_FIVE_COVER_APPROVAL_ID,
        proposals: APPROVED_COVER_PROMOTION_PROPOSALS,
        proposalIds: APPROVED_COVER_PROPOSAL_IDS,
      }),
    ).not.toThrow();
    expect(DIAGNOSTIC_FIVE_COVER_MANIFEST_HASH).toHaveLength(64);

    expect(() =>
      verifyApprovedCoverManifest({
        approvalId: DIAGNOSTIC_FIVE_COVER_APPROVAL_ID,
        proposals: APPROVED_COVER_PROMOTION_PROPOSALS,
        proposalIds: APPROVED_COVER_PROPOSAL_IDS.slice(1),
      }),
    ).toThrow("allow-list is not the exact approved set");
    expect(() =>
      verifyApprovedCoverManifest({
        approvalId: DIAGNOSTIC_FIVE_COVER_APPROVAL_ID,
        proposals: [
          {
            ...APPROVED_COVER_PROMOTION_PROPOSALS[0],
            sourceRevision: "stale-provider-content",
          },
          ...APPROVED_COVER_PROMOTION_PROPOSALS.slice(1),
        ],
        proposalIds: APPROVED_COVER_PROPOSAL_IDS,
      }),
    ).toThrow("manifest hash is stale");
  });

  it("records five reviewed covers without claiming rights or false edition identity", () => {
    const graph = buildCatalogImportGraph(
      legacyBooksToImportRecords(baseCatalog),
    );
    expect(graph.coverCandidates).toHaveLength(5);
    expect(graph.coverInspections).toHaveLength(5);
    expect(graph.coverDecisionHeads).toHaveLength(5);
    expect(graph.coverProjectionHeads).toHaveLength(5);
    expect(graph.coverProjections).toHaveLength(10);
    expect(
      graph.coverCandidates.every(
        (candidate) =>
          candidate.permissionState === "pending" &&
          candidate.rightsBasis === null &&
          JSON.parse(String(candidate.identityEvidenceJson)).rightsStatus ===
            "deferred_poc" &&
          JSON.parse(String(candidate.identityEvidenceJson)).rightsCleared ===
            false,
      ),
    ).toBe(true);
    expect(
      graph.coverCandidates.filter(
        (candidate) => candidate.representationType === "selected_edition",
      ),
    ).toEqual([
      expect.objectContaining({
        workId: "7adeda04-34e2-5a7d-a101-de0578138b29",
        identityMatchKind: "exact_isbn",
      }),
    ]);
    expect(
      graph.coverCandidates.filter(
        (candidate) => candidate.representationType === "work_representative",
      ),
    ).toHaveLength(4);
    expect(
      graph.coverDecisions.filter(
        (decision) =>
          decision.state === "eligible" &&
          decision.reviewerRef === "review:github-issue-143",
      ),
    ).toHaveLength(5);
    expect(
      graph.coverProjections.filter(
        (projection) =>
          projection.state === "placeholder" &&
          projection.previousProjectionId === null,
      ),
    ).toHaveLength(5);
  }, 30_000);
});
