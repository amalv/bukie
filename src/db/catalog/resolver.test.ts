import { describe, expect, it } from "vitest";
import { ADR_RESOLUTION_FIXTURES } from "./fixtures";
import { type ResolutionCandidate, resolveField } from "./resolver";

function candidate(
  overrides: Partial<ResolutionCandidate> = {},
): ResolutionCandidate {
  return {
    id: "observation-a",
    sourceKey: "source-a",
    sourceApproved: true,
    sourcePriority: 1,
    value: "1965",
    provenanceKind: "imported",
    state: "active",
    retrievedAt: 100,
    ...overrides,
  };
}

describe("catalog field resolver", () => {
  it("selects the more precise compatible publication date", () => {
    expect(
      resolveField("edition.publication_date", [
        ...ADR_RESOLUTION_FIXTURES.compatibleDates,
      ]),
    ).toMatchObject({
      state: "present",
      selectedObservationId: "adr-observation-b",
    });
  });

  it("marks incompatible equally eligible dates conflicting", () => {
    expect(
      resolveField("edition.publication_date", [
        ...ADR_RESOLUTION_FIXTURES.conflictingDates,
      ]),
    ).toMatchObject({
      state: "conflicting",
      selectedObservationId: null,
    });
  });

  it("resolves work first-publication objects without inventing precision", () => {
    expect(
      resolveField("work.first_publication_date", [
        candidate({
          id: "year",
          value: { date: "1965", precision: "year" },
        }),
        candidate({
          id: "month",
          value: { date: "1965-06", precision: "month" },
        }),
      ]),
    ).toMatchObject({
      state: "present",
      selectedObservationId: "month",
    });
  });

  it("rejects invalid or mismatched publication precision", () => {
    expect(
      resolveField("work.first_publication_date", [
        candidate({ value: { date: "1965", precision: "day" } }),
        candidate({
          id: "invalid-month",
          value: { date: "1965-13", precision: "month" },
        }),
      ]),
    ).toMatchObject({
      state: "missing",
      selectedObservationId: null,
    });
  });

  it("keeps conflicting stale work dates out of resolution", () => {
    expect(
      resolveField("work.first_publication_date", [
        candidate({
          id: "stale-a",
          value: { date: "1965", precision: "year" },
          state: "stale",
        }),
        candidate({
          id: "stale-b",
          value: { date: "1966", precision: "year" },
          state: "stale",
        }),
      ]),
    ).toMatchObject({
      state: "conflicting",
      selectedObservationId: null,
    });
  });

  it("uses an attributable curated correction without deleting evidence", () => {
    expect(
      resolveField("work.preferred_title", [
        candidate({ value: "Imported title" }),
        candidate({
          id: "curated",
          value: "Curated title",
          provenanceKind: "curated",
          actorRef: "user:catalog-editor",
          reason: "Corrected from title page",
        }),
      ]),
    ).toMatchObject({
      state: "present",
      selectedObservationId: "curated",
    });
  });

  it("represents missing, stale, invalid, and withdrawn lifecycle states", () => {
    expect(resolveField("edition.pages", [])).toMatchObject({
      state: "missing",
      selectedObservationId: null,
    });
    expect(
      resolveField("work.description", [
        ...ADR_RESOLUTION_FIXTURES.staleDescription,
      ]),
    ).toMatchObject({
      state: "stale",
      selectedObservationId: "adr-observation-stale",
    });
    expect(
      resolveField("edition.identifiers", [
        candidate({ state: "invalid", value: "not-an-isbn" }),
      ]),
    ).toMatchObject({ state: "missing", selectedObservationId: null });
    expect(
      resolveField("edition.covers", [
        ...ADR_RESOLUTION_FIXTURES.withdrawnCover,
      ]),
    ).toMatchObject({ state: "withdrawn", selectedObservationId: null });
  });

  it("prevents synthetic evidence from resolving public bibliography", () => {
    expect(
      resolveField("work.description", [
        ...ADR_RESOLUTION_FIXTURES.syntheticDescription,
      ]),
    ).toMatchObject({ state: "missing", selectedObservationId: null });
    expect(
      resolveField("legacy.rating", [
        candidate({ provenanceKind: "synthetic", value: 4.4 }),
      ]),
    ).toMatchObject({
      state: "present",
      selectedObservationId: "observation-a",
    });
  });

  it("does not resolve observations from pending or suspended source policy", () => {
    expect(
      resolveField("work.preferred_title", [
        candidate({ sourceApproved: false, value: "Pending source title" }),
      ]),
    ).toMatchObject({ state: "missing", selectedObservationId: null });
  });
});
