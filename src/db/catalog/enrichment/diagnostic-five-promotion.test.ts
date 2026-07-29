import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import baseCatalog from "../../../../artifacts/catalog";
import {
  buildCatalogImportGraph,
  legacyBooksToImportRecords,
} from "../importer";
import {
  APPROVED_DRY_RUN_MANIFEST_HASH,
  APPROVED_PROMOTION_PROPOSALS,
  assertApprovedPromotionReportContent,
  DIAGNOSTIC_FIVE_PROMOTION_APPROVAL,
  DIAGNOSTIC_FIVE_PROMOTION_APPROVAL_ID,
  proposalId,
  verifyApprovedPromotionReport,
} from "./diagnostic-five-promotion";

const reportBytes = readFileSync(
  "docs/reports/catalog-enrichment-dry-run-2026-07-29.json",
);

describe("diagnostic-five promotion approval", () => {
  it("accepts only the exact report, manifest, approval, and proposal allow-list", () => {
    const report = verifyApprovedPromotionReport(reportBytes, {
      approvalId: DIAGNOSTIC_FIVE_PROMOTION_APPROVAL_ID,
      proposalIds: DIAGNOSTIC_FIVE_PROMOTION_APPROVAL.approvedProposalIds,
    });

    expect(report.manifest.contentHash).toBe(APPROVED_DRY_RUN_MANIFEST_HASH);
    expect(
      report.proposedResolutions
        .filter((proposal) =>
          DIAGNOSTIC_FIVE_PROMOTION_APPROVAL.approvedProposalIds.includes(
            proposalId(proposal) as never,
          ),
        )
        .map((proposal) => proposal.title)
        .sort(),
    ).toEqual(APPROVED_PROMOTION_PROPOSALS.map((entry) => entry.title).sort());
  });

  it("fails closed for stale reports and incomplete or expanded allow-lists", () => {
    const stale = Buffer.from(reportBytes);
    stale[100] = stale[100] === 32 ? 33 : 32;
    expect(() =>
      verifyApprovedPromotionReport(stale, {
        approvalId: DIAGNOSTIC_FIVE_PROMOTION_APPROVAL_ID,
        proposalIds: DIAGNOSTIC_FIVE_PROMOTION_APPROVAL.approvedProposalIds,
      }),
    ).toThrow("report hash is stale");
    expect(() =>
      verifyApprovedPromotionReport(reportBytes, {
        approvalId: DIAGNOSTIC_FIVE_PROMOTION_APPROVAL_ID,
        proposalIds:
          DIAGNOSTIC_FIVE_PROMOTION_APPROVAL.approvedProposalIds.slice(1),
      }),
    ).toThrow("allow-list is not the exact approved set");
    expect(() =>
      verifyApprovedPromotionReport(reportBytes, {
        approvalId: "inferred-from-passing-ci",
        proposalIds: DIAGNOSTIC_FIVE_PROMOTION_APPROVAL.approvedProposalIds,
      }),
    ).toThrow("approval ID is not exact");

    const staleManifest = JSON.parse(reportBytes.toString("utf8"));
    staleManifest.manifest.contentHash = "0".repeat(64);
    expect(() => assertApprovedPromotionReportContent(staleManifest)).toThrow(
      "manifest or isolated-run identity drifted",
    );
  });

  it("keeps Dune, descriptions, and covers unresolved in deterministic inputs", () => {
    const graph = buildCatalogImportGraph(
      legacyBooksToImportRecords(baseCatalog),
    );
    const promoted = graph.works.filter(
      (work) => work.firstPublicationDate !== null,
    );
    expect(promoted).toHaveLength(4);
    expect(
      graph.works.find((work) => work.preferredTitle === "Dune"),
    ).toMatchObject({ firstPublicationDate: null });
    expect(
      graph.metadataSources.find(
        (source) =>
          source.key === "wikidata_reviewed_first_publication_issue_143",
      ),
    ).toMatchObject({
      approvalState: "approved",
      payloadPolicy: "full",
    });
    expect(
      graph.fieldObservations.filter((observation) =>
        ["work.description", "edition.covers"].includes(
          String(observation.fieldKey),
        ),
      ),
    ).not.toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          sourcePath: "catalog-enrichment-promotion-issue-143",
        }),
      ]),
    );
    expect(
      DIAGNOSTIC_FIVE_PROMOTION_APPROVAL.productionDatabaseExecutionApproved,
    ).toBe(false);
  });

  it("retains the prior missing head behind every deterministic promotion", () => {
    const graph = buildCatalogImportGraph(
      legacyBooksToImportRecords(baseCatalog),
    );
    const resolutions = new Map(
      graph.fieldResolutions.map((resolution) => [resolution.id, resolution]),
    );
    for (const proposal of APPROVED_PROMOTION_PROPOSALS) {
      const head = graph.fieldResolutionHeads.find(
        (candidate) =>
          candidate.entityId === proposal.workId &&
          candidate.fieldKey === "work.first_publication_date",
      );
      const current = resolutions.get(head?.resolutionId);
      const previous = resolutions.get(current?.previousResolutionId);
      expect(current).toMatchObject({
        state: "present",
        resolverVersion: "diagnostic-five-first-publication-2026-07-29.v1",
      });
      expect(previous).toMatchObject({
        state: "missing",
        selectedObservationId: null,
        previousResolutionId: null,
      });
    }
  });
});
