import { describe, expect, it } from "vitest";
import { matchProviderRecord } from "./matching";
import {
  BUKIE_EDITORIAL_ADAPTER,
  ENRICHMENT_ADAPTERS,
  getAdapterManifest,
  PENDING_ADAPTERS,
  WIKIDATA_WORK_FACTS_ADAPTER,
} from "./policies";
import {
  assertSampleScope,
  ENRICHMENT_SAMPLE_MANIFEST,
} from "./sample-manifest";
import type { ProviderRecord } from "./types";

const dune = ENRICHMENT_SAMPLE_MANIFEST.works[0];

function wikidataRecord(
  overrides: Partial<ProviderRecord> = {},
): ProviderRecord {
  return {
    adapterId: WIKIDATA_WORK_FACTS_ADAPTER.adapterId,
    recordKey: "Q190192",
    sourceRevision: "fixture-revision",
    retrievedAt: 1,
    targetWorkId: dune.workId,
    title: dune.title,
    orderedCreators: dune.orderedCreators,
    providerWorkId: "Q190192",
    evidence: [],
    ...overrides,
  };
}

describe("enrichment policies and five-work scope", () => {
  it("declares separate metadata, text, and asset permissions for every adapter", () => {
    for (const adapter of ENRICHMENT_ADAPTERS) {
      expect(Object.keys(adapter.permissions).sort()).toEqual([
        "asset",
        "metadata",
        "text",
      ]);
      for (const permission of Object.values(adapter.permissions)) {
        expect(permission).toMatchObject({
          fetch: expect.any(Boolean),
          cache: expect.any(Boolean),
          retain: expect.stringMatching(/^(none|selected_fields|full)$/),
          transform: expect.any(Boolean),
          display: expect.any(Boolean),
        });
      }
      expect(adapter.proposedEvidenceOnly).toBe(true);
    }
  });

  it("enables only Bukie editorial and Wikidata work facts", () => {
    expect(BUKIE_EDITORIAL_ADAPTER.state).toBe("enabled");
    expect(WIKIDATA_WORK_FACTS_ADAPTER.state).toBe("enabled");
    expect(PENDING_ADAPTERS).toHaveLength(9);
    for (const adapter of PENDING_ADAPTERS) {
      expect(adapter.state).toBe("pending");
      expect(adapter.disabledReason).toBeTruthy();
      expect(adapter.nextReviewDate).toMatch(/^\d{4}-\d{2}-\d{2}$/);
      expect(
        Object.values(adapter.permissions).every(
          (permission) =>
            !permission.fetch &&
            !permission.display &&
            permission.allowedFields.length === 0,
        ),
      ).toBe(true);
    }
  });

  it("fails closed outside the explicit versioned sample manifest", () => {
    expect(ENRICHMENT_SAMPLE_MANIFEST.version).toBe("2026-07-28.v1");
    expect(ENRICHMENT_SAMPLE_MANIFEST.works).toHaveLength(5);
    expect(() =>
      assertSampleScope(["ffffffff-ffff-5fff-8fff-ffffffffffff"]),
    ).toThrow("outside bukie-enrichment-diagnostic-five");
    expect(() => assertSampleScope([dune.workId, dune.workId])).toThrow(
      "duplicate work IDs",
    );
  });

  it("does not expose an unregistered provider adapter", () => {
    expect(() => getAdapterManifest("unregistered.provider")).toThrow(
      "unknown adapter",
    );
  });
});

describe("conservative provider-neutral matching", () => {
  it("activates exact provider-native work relations", () => {
    expect(
      matchProviderRecord({
        adapter: WIKIDATA_WORK_FACTS_ADAPTER,
        record: wikidataRecord(),
        target: dune,
      }),
    ).toMatchObject({
      outcome: "active",
      matchKind: "source_relationship",
      mappingConfidence: 1,
    });
  });

  it("keeps title plus ordered creator as a candidate only", () => {
    expect(
      matchProviderRecord({
        adapter: WIKIDATA_WORK_FACTS_ADAPTER,
        record: wikidataRecord({ providerWorkId: "Q999999" }),
        target: dune,
      }),
    ).toMatchObject({ outcome: "candidate", matchKind: "candidate" });
  });

  it("never activates title-only evidence", () => {
    expect(
      matchProviderRecord({
        adapter: WIKIDATA_WORK_FACTS_ADAPTER,
        record: wikidataRecord({
          providerWorkId: undefined,
          orderedCreators: undefined,
        }),
        target: dune,
      }),
    ).toMatchObject({ outcome: "unmatched", mappingConfidence: 0.2 });
  });

  it("routes ambiguity, conflicts, and withdrawals away from active links", () => {
    expect(
      matchProviderRecord({
        adapter: WIKIDATA_WORK_FACTS_ADAPTER,
        record: wikidataRecord({
          identityConflicts: ["same-title film", "edition-like claims"],
        }),
        target: dune,
      }),
    ).toMatchObject({ outcome: "ambiguous" });
    expect(
      matchProviderRecord({
        adapter: WIKIDATA_WORK_FACTS_ADAPTER,
        record: wikidataRecord({ state: "withdrawn" }),
        target: dune,
      }),
    ).toMatchObject({ outcome: "withdrawn" });
    expect(
      matchProviderRecord({
        adapter: WIKIDATA_WORK_FACTS_ADAPTER,
        record: wikidataRecord({
          rejectedReason: "Provider record was manually rejected",
        }),
        target: dune,
      }),
    ).toMatchObject({ outcome: "rejected" });
    expect(
      matchProviderRecord({
        adapter: WIKIDATA_WORK_FACTS_ADAPTER,
        record: wikidataRecord({ title: "A different work" }),
        target: dune,
      }),
    ).toMatchObject({
      outcome: "ambiguous",
      reason: "Provider-native relation conflicts with supplied work identity",
    });
  });

  it("uses the internal work ID as Bukie editorial identity", () => {
    expect(
      matchProviderRecord({
        adapter: BUKIE_EDITORIAL_ADAPTER,
        record: {
          ...wikidataRecord(),
          adapterId: BUKIE_EDITORIAL_ADAPTER.adapterId,
          providerWorkId: undefined,
        },
        target: dune,
      }),
    ).toMatchObject({ outcome: "active", matchKind: "curated" });
  });
});
