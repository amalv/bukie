import { describe, expect, it } from "vitest";
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
});
