import { describe, expect, it } from "vitest";
import { canonicalJson, hashCanonicalJson } from "../identity";
import { SAMPLE_PROVIDER_RECORDS } from "./fixtures";
import { ENRICHMENT_SAMPLE_MANIFEST } from "./sample-manifest";
import type { EnrichmentRunFailure, ProviderRecord } from "./types";
import { buildEnrichmentRun as buildEnrichmentRunForManifest } from "./workflow";

function buildEnrichmentRun(input: {
  requestedWorkIds: readonly string[];
  records: readonly ProviderRecord[];
  failures?: readonly EnrichmentRunFailure[];
}) {
  return buildEnrichmentRunForManifest({
    manifest: ENRICHMENT_SAMPLE_MANIFEST,
    ...input,
  });
}

const workIds: string[] = ENRICHMENT_SAMPLE_MANIFEST.works.map(
  (work) => work.workId,
);

describe("isolated five-work enrichment workflow", () => {
  it("takes scope identity and targets from an injected manifest", () => {
    const manifest = {
      ...ENRICHMENT_SAMPLE_MANIFEST,
      id: "future-approved-batch",
      version: "v2",
      works: [ENRICHMENT_SAMPLE_MANIFEST.works[1]],
    };
    const records = SAMPLE_PROVIDER_RECORDS.filter(
      (record) => record.targetWorkId === manifest.works[0].workId,
    );
    const run = buildEnrichmentRunForManifest({
      manifest,
      requestedWorkIds: [manifest.works[0].workId],
      records,
    });

    expect(run.manifestId).toBe("future-approved-batch");
    expect(run.manifestVersion).toBe("v2");
    expect(run.requestedWorkIds).toEqual([manifest.works[0].workId]);
  });

  it("builds deterministic source records, links, and immutable observations", () => {
    const first = buildEnrichmentRun({
      requestedWorkIds: workIds,
      records: SAMPLE_PROVIDER_RECORDS,
    });
    const second = buildEnrichmentRun({
      requestedWorkIds: [...workIds].reverse(),
      records: [...SAMPLE_PROVIDER_RECORDS].reverse(),
    });

    expect(first).toEqual(second);
    expect(hashCanonicalJson(first)).toBe(hashCanonicalJson(second));
    expect(first.sourceRecords).toHaveLength(10);
    expect(first.sourceRecordLinks).toHaveLength(10);
    expect(first.fieldObservations).toHaveLength(9);
    expect(first.proposedResolutionHeads).toEqual([]);
    expect(first.report.links).toMatchObject({
      active: 9,
      ambiguous: 1,
      candidate: 0,
      unmatched: 0,
    });
    expect(first.report.observations).toEqual({
      created: 9,
      reused: 0,
      rejected: 0,
      omitted: 1,
    });
    expect(first.report.reviewQueueCandidates).toBe(1);
  });

  it("contains only the requested sample and approved adapters", () => {
    const run = buildEnrichmentRun({
      requestedWorkIds: workIds,
      records: SAMPLE_PROVIDER_RECORDS,
    });
    expect(new Set(run.requestedWorkIds)).toEqual(new Set(workIds));
    expect(
      run.sourceRecordLinks.every((link) => workIds.includes(link.entityId)),
    ).toBe(true);
    expect(run.metadataSources.map((source) => source.key).sort()).toEqual([
      "bukie_editorial",
      "wikidata",
    ]);
    expect(canonicalJson(run)).not.toMatch(
      /open_library|google_books|worldcat|wikipedia_prose/,
    );
  });

  it("creates no display resolution or current-head mutation", () => {
    const run = buildEnrichmentRun({
      requestedWorkIds: workIds,
      records: SAMPLE_PROVIDER_RECORDS,
    });
    expect(run.proposedResolutionHeads).toHaveLength(0);
    expect(
      run.metadataSources.every((source) =>
        String(source.metadataPolicy).includes('"proposedEvidenceOnly":true'),
      ),
    ).toBe(true);
    const policyBySource = new Map(
      run.metadataSources.map((source) => [
        source.key,
        JSON.parse(String(source.metadataPolicy)),
      ]),
    );
    expect(policyBySource.get("bukie_editorial")?.display).toBe(true);
    expect(policyBySource.get("wikidata")?.display).toBe(false);
    expect(
      run.metadataSources.every(
        (source) => JSON.parse(String(source.assetPolicy)).display === false,
      ),
    ).toBe(true);
  });

  it("fails closed for unrequested or out-of-manifest target IDs", () => {
    const outside = {
      ...SAMPLE_PROVIDER_RECORDS[0],
      targetWorkId: "ffffffff-ffff-5fff-8fff-ffffffffffff",
    };
    expect(() =>
      buildEnrichmentRun({
        requestedWorkIds: workIds,
        records: [outside],
      }),
    ).toThrow("targets an unrequested work");
    expect(() =>
      buildEnrichmentRun({
        requestedWorkIds: [outside.targetWorkId],
        records: [outside],
      }),
    ).toThrow("outside bukie-enrichment-diagnostic-five");
  });

  it("fails closed for pending policy, absent field permission, and missing revision", () => {
    expect(() =>
      buildEnrichmentRun({
        requestedWorkIds: [workIds[0]],
        records: [
          {
            ...SAMPLE_PROVIDER_RECORDS[0],
            adapterId: "open-library.metadata",
          },
        ],
      }),
    ).toThrow("is pending");
    expect(() =>
      buildEnrichmentRun({
        requestedWorkIds: [workIds[0]],
        records: [
          {
            ...SAMPLE_PROVIDER_RECORDS[0],
            evidence: [
              {
                fieldClass: "asset",
                fieldKey: "edition.covers",
                value: "/covers/not-allowed.webp",
                sourcePath: "cover",
                provenanceKind: "curated",
              },
            ],
          },
        ],
      }),
    ).toThrow("may not acquire asset field edition.covers");
    expect(() =>
      buildEnrichmentRun({
        requestedWorkIds: [workIds[0]],
        records: [{ ...SAMPLE_PROVIDER_RECORDS[0], sourceRevision: "" }],
      }),
    ).toThrow("requires a source revision");
  });

  it("fails closed when deterministic source-revision identity is duplicated", () => {
    expect(() =>
      buildEnrichmentRun({
        requestedWorkIds: [workIds[0]],
        records: [SAMPLE_PROVIDER_RECORDS[0], SAMPLE_PROVIDER_RECORDS[0]],
      }),
    ).toThrow("duplicate source record revision");
  });

  it("hashes structured identity tuples without delimiter collisions", () => {
    const base = SAMPLE_PROVIDER_RECORDS[0];
    const left = buildEnrichmentRun({
      requestedWorkIds: [base.targetWorkId],
      records: [{ ...base, recordKey: "record@part", sourceRevision: "v1" }],
    });
    const right = buildEnrichmentRun({
      requestedWorkIds: [base.targetWorkId],
      records: [{ ...base, recordKey: "record", sourceRevision: "part@v1" }],
    });
    expect(left.sourceRecords[0].id).not.toBe(right.sourceRecords[0].id);
    expect(left.sourceRecords[0].recordKey).not.toBe(
      right.sourceRecords[0].recordKey,
    );

    const firstSnapshot = buildEnrichmentRun({
      requestedWorkIds: [base.targetWorkId],
      records: [
        { ...base, recordKey: "first", sourceRevision: "a+b" },
        { ...base, recordKey: "second", sourceRevision: "c" },
      ],
    });
    const secondSnapshot = buildEnrichmentRun({
      requestedWorkIds: [base.targetWorkId],
      records: [
        { ...base, recordKey: "first", sourceRevision: "a" },
        { ...base, recordKey: "second", sourceRevision: "b+c" },
      ],
    });
    expect(firstSnapshot.adapterSnapshots[0].sourceRevision).not.toBe(
      secondSnapshot.adapterSnapshots[0].sourceRevision,
    );
    expect(firstSnapshot.adapterSnapshots[0].snapshotId).not.toBe(
      secondSnapshot.adapterSnapshots[0].snapshotId,
    );
  });

  it("accounts for policy, acquisition, provider, parsing, and normalization outcomes", () => {
    const rejected = {
      ...SAMPLE_PROVIDER_RECORDS[0],
      rejectedReason: "Reviewed identity rejection",
      acquisition: {
        successful: true,
        status: 200,
        statusClasses: { "2xx": 1 },
        throttles: 0,
      },
    };
    const run = buildEnrichmentRun({
      requestedWorkIds: [rejected.targetWorkId],
      records: [rejected],
      failures: [
        { kind: "policy", adapterId: "pending", recordKey: "policy" },
        {
          kind: "acquisition",
          adapterId: "wikidata.work-facts",
          recordKey: "network",
          retries: 2,
        },
        {
          kind: "provider",
          adapterId: "wikidata.work-facts",
          recordKey: "Q1",
          statusClasses: { "4xx": 1, "5xx": 1 },
          throttles: 1,
          retryAfterMs: 2_000,
        },
        {
          kind: "parsing",
          adapterId: "wikidata.work-facts",
          recordKey: "parse",
        },
        {
          kind: "normalization",
          adapterId: "wikidata.work-facts",
          recordKey: "normalize",
        },
      ],
    });

    expect(run.report).toMatchObject({
      requestedRecords: 6,
      successfulRequests: 1,
      policyBlocks: 1,
      acquisitionFailures: 1,
      providerFailures: 1,
      parsingFailures: 1,
      normalizationFailures: 1,
      retries: 2,
      throttles: 1,
      retryAfterMs: 2_000,
      statusClasses: {
        "2xx": 1,
        "4xx": 1,
        "5xx": 1,
      },
      observations: {
        created: 0,
        reused: 0,
        rejected: 1,
        omitted: 0,
      },
    });
  });

  it("records withdrawal without creating observations or heads", () => {
    const withdrawn = buildEnrichmentRun({
      requestedWorkIds: [workIds[0]],
      records: [
        {
          ...SAMPLE_PROVIDER_RECORDS[0],
          state: "withdrawn",
        },
      ],
    });
    expect(withdrawn.sourceRecords[0]?.state).toBe("withdrawn");
    expect(withdrawn.sourceRecordLinks[0]?.outcome).toBe("withdrawn");
    expect(withdrawn.fieldObservations).toHaveLength(0);
    expect(withdrawn.proposedResolutionHeads).toHaveLength(0);
  });

  it("refuses sensitive or policy-prohibited raw payload retention", () => {
    expect(() =>
      buildEnrichmentRun({
        requestedWorkIds: [workIds[0]],
        records: [
          {
            ...SAMPLE_PROVIDER_RECORDS[0],
            rawPayload: { authorization: "Bearer secret-value" },
          },
        ],
      }),
    ).toThrow("sensitive payload fields");
    expect(() =>
      buildEnrichmentRun({
        requestedWorkIds: [workIds[0]],
        records: [
          {
            ...SAMPLE_PROVIDER_RECORDS[0],
            rawPayload: { title: "Dune" },
          },
        ],
      }),
    ).toThrow("raw payload retention is not permitted");
  });
});
