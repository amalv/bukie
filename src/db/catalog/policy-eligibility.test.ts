import { describe, expect, it } from "vitest";
import { sourcePolicyAllowsFieldDisplay } from "./policy-eligibility";

describe("source field display policy", () => {
  it("allows display when an optional allowlist includes the field", () => {
    expect(
      sourcePolicyAllowsFieldDisplay(
        JSON.stringify({
          display: true,
          fieldPermission: {
            allowedFields: ["work.first_publication_date"],
          },
          proposedEvidenceOnly: false,
        }),
        "work.first_publication_date",
      ),
    ).toBe(true);
  });

  it("preserves broad internal policies without a field allowlist", () => {
    expect(
      sourcePolicyAllowsFieldDisplay(
        { display: true },
        "edition.publication_date",
      ),
    ).toBe(true);
  });

  it("allows fields declared by the separate text permission", () => {
    expect(
      sourcePolicyAllowsFieldDisplay(
        {
          display: true,
          fieldPermission: { allowedFields: ["work.preferred_title"] },
          textPermission: { allowedFields: ["work.description"] },
        },
        "work.description",
      ),
    ).toBe(true);
  });

  it.each([
    ["proposed-only", { display: true, proposedEvidenceOnly: true }],
    [
      "field denied",
      {
        display: true,
        fieldPermission: { allowedFields: ["work.description"] },
      },
    ],
    ["display denied", { display: false }],
    [
      "malformed field scope",
      { display: true, fieldPermission: { allowedFields: "work.description" } },
    ],
    ["malformed", "{not-json"],
  ])("rejects %s policy", (_case, policy) => {
    expect(
      sourcePolicyAllowsFieldDisplay(
        policy as string | Record<string, unknown>,
        "work.first_publication_date",
      ),
    ).toBe(false);
  });
});
