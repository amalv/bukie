import { describe, expect, it } from "vitest";
import { DESCRIPTION_FIXTURE_TEXT, modelDescriptionFixture } from "./fixtures";
import { validateDescriptionCandidate } from "./validation";

const eligibleParents = modelDescriptionFixture().claims.map(
  (claim, index) => ({
    id: claim.parentObservationIds[0] ?? `missing-${index}`,
    entityType: "work",
    entityId: modelDescriptionFixture().workId,
    workId: modelDescriptionFixture().workId,
    fieldKey: `work.fixture_${index}`,
    value: `fixture-${index}`,
    sourceText: null,
    eligible: true,
    unresolvedConflict: false,
  }),
);

describe("deterministic description validation", () => {
  it("keeps the exact eight-word rule as a review warning", () => {
    const sourceExcerpt = modelDescriptionFixture()
      .text.split(/\s+/u)
      .slice(0, 8)
      .join(" ");
    const candidate = modelDescriptionFixture(undefined, {
      comparisonTexts: [sourceExcerpt],
    });
    const result = validateDescriptionCandidate({
      candidate,
      parents: eligibleParents,
    });

    expect(result.warningCodes).toContain("copying_exact_eight_word_match");
    expect(result.rejectionCodes).not.toContain("copying_similarity_high");
    expect(result.requiresHumanReview).toBe(true);
  });

  it("rejects high copying similarity separately from the warning heuristic", () => {
    const candidate = modelDescriptionFixture(undefined, {
      comparisonTexts: [DESCRIPTION_FIXTURE_TEXT],
    });
    const result = validateDescriptionCandidate({
      candidate,
      parents: eligibleParents,
    });

    expect(result.rejectionCodes).toContain("copying_similarity_high");
  });

  it.each([
    {
      name: "length",
      text: "Too short to be an eligible description.",
      code: "length_out_of_range",
    },
    {
      name: "readability",
      text: Array.from(
        { length: 90 },
        () => "antidisestablishmentarianism",
      ).join(" "),
      code: "readability_out_of_range",
    },
    {
      name: "tone",
      text: `${DESCRIPTION_FIXTURE_TEXT} This is a must-read masterpiece.`,
      code: "tone_non_neutral",
    },
    {
      name: "spoiler",
      text: `${DESCRIPTION_FIXTURE_TEXT} The killer is the trusted guide.`,
      code: "spoiler_risk",
    },
  ])("uses a stable rejection code for $name failures", ({ text, code }) => {
    const result = validateDescriptionCandidate({
      candidate: modelDescriptionFixture(undefined, { text }),
      parents: eligibleParents,
    });

    expect(result.rejectionCodes).toContain(code);
  });

  it("requires explicit review for ambiguous and sensitive cases", () => {
    const result = validateDescriptionCandidate({
      candidate: modelDescriptionFixture(undefined, {
        ambiguousIdentity: true,
        sensitiveContent: true,
      }),
      parents: eligibleParents,
    });

    expect(result.warningCodes).toEqual(
      expect.arrayContaining([
        "ambiguous_identity_review",
        "sensitive_content_review",
        "initial_model_review",
      ]),
    );
    expect(result.requiresHumanReview).toBe(true);
  });

  it("rejects candidate sentences that are not mapped verbatim to evidence claims", () => {
    const candidate = modelDescriptionFixture();
    const result = validateDescriptionCandidate({
      candidate: {
        ...candidate,
        text: `${candidate.text} An unsupported factual sentence was added.`,
      },
      parents: eligibleParents,
    });

    expect(result.rejectionCodes).toContain(
      "candidate_claim_coverage_incomplete",
    );
  });
});
