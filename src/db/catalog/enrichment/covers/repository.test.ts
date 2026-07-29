import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { PLACEHOLDER_COVER } from "../../../../media/covers";
import { buildCatalogImportGraph } from "../../importer";
import { openCatalogSqlite, rebuildCatalogSqlite } from "../../sqlite-rebuild";
import { SAMPLE_BASELINE_IMPORT_RECORDS } from "../fixtures";
import { ENRICHMENT_SAMPLE_MANIFEST } from "../sample-manifest";
import {
  approvedCoverFixture,
  recordedFiveCoverFixtures,
  seedCoverFixturesSqlite,
} from "./fixtures";
import {
  createCoverCandidateSqlite,
  getCoverSelectionSqlite,
  retryCoverWithdrawalPurgeSqlite,
  reviewCoverCandidateSqlite,
  rollbackCoverProjectionSqlite,
  withdrawCoverCandidateSqlite,
} from "./repository";

const NOW = Date.UTC(2026, 6, 29, 12, 0, 0);

describe("SQLite edition-matched cover lifecycle", () => {
  let directory: string;
  let raw: ReturnType<typeof openCatalogSqlite>["raw"];
  let editionIds: Record<string, string>;

  beforeEach(() => {
    directory = mkdtempSync(path.join(tmpdir(), "bukie-covers-test-"));
    const sqlitePath = path.join(directory, "covers.sqlite");
    rebuildCatalogSqlite({
      sqlitePath,
      graph: buildCatalogImportGraph(SAMPLE_BASELINE_IMPORT_RECORDS),
    });
    raw = openCatalogSqlite(sqlitePath).raw;
    seedCoverFixturesSqlite(raw);
    editionIds = Object.fromEntries(
      ENRICHMENT_SAMPLE_MANIFEST.works.map((work) => {
        const row = raw
          .prepare("select preferred_edition_id as id from works where id = ?")
          .get(work.workId) as { id: string };
        return [work.workId, row.id];
      }),
    );
  });

  afterEach(() => {
    raw.close();
    rmSync(directory, { recursive: true, force: true });
  });

  it("re-evaluates all five recorded covers with the documented review reasons", () => {
    const fixtures = recordedFiveCoverFixtures({ editionIds });
    const results = fixtures.map((fixture) => ({
      title: fixture.title,
      result: createCoverCandidateSqlite(raw, fixture),
    }));

    expect(results).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          title: "Dune",
          result: expect.objectContaining({
            state: "rejected",
            gateCodes: expect.arrayContaining(["identity_conflict"]),
            warningCodes: expect.arrayContaining([
              "square_canvas",
              "sidebars",
              "extreme_crop",
            ]),
          }),
        }),
        expect.objectContaining({
          title: "Moby-Dick",
          result: expect.objectContaining({
            state: "rejected",
            gateCodes: expect.arrayContaining([
              "identity_conflict",
              "locale_conflict",
              "adaptation_conflict",
            ]),
          }),
        }),
      ]),
    );
    for (const title of [
      "The City and the Stars",
      "Born a Crime",
      "Faithful Place",
    ]) {
      expect(results.find((row) => row.title === title)?.result).toMatchObject({
        state: "review_required",
        gateCodes: expect.arrayContaining([
          "identity_evidence_ineligible",
          "rights_evidence_incomplete",
        ]),
        warningCodes: ["upscaling_risk"],
      });
    }
    for (const fixture of fixtures) {
      expect(
        getCoverSelectionSqlite(raw, fixture.candidate.workId),
      ).toMatchObject({
        candidateId: null,
        objectKey: PLACEHOLDER_COVER,
        publicDisplayEligible: false,
      });
    }
    expect(
      raw
        .prepare(
          `select count(*) as count from cover_inspections
           where media_type is not null and byte_size > 0 and width > 0
             and height > 0 and aspect_ratio > 0 and length(checksum) = 64`,
        )
        .get(),
    ).toEqual({ count: 5 });
  });

  it("is idempotent and rolls back a failed inspection transaction", () => {
    const work = ENRICHMENT_SAMPLE_MANIFEST.works[0];
    const fixture = approvedCoverFixture({
      workId: work.workId,
      editionId: editionIds[work.workId],
    });
    const first = createCoverCandidateSqlite(raw, fixture);
    const retry = createCoverCandidateSqlite(raw, fixture);

    expect(first.state).toBe("eligible");
    expect(retry).toMatchObject({
      candidateId: first.candidateId,
      inspectionId: first.inspectionId,
      decisionId: first.decisionId,
      changed: false,
    });
    expect(
      raw.prepare("select count(*) as count from cover_candidates").get(),
    ).toEqual({ count: 1 });

    const failed = approvedCoverFixture({
      workId: work.workId,
      editionId: editionIds[work.workId],
      suffix: "forced-failure",
    });
    expect(() =>
      createCoverCandidateSqlite(raw, {
        ...failed,
        failAfter: "decision",
      }),
    ).toThrow("Forced SQLite cover decision failure");
    expect(
      raw.prepare("select count(*) as count from cover_candidates").get(),
    ).toEqual({ count: 1 });
  });

  it("keeps scores advisory and requires warning acknowledgement", () => {
    const work = ENRICHMENT_SAMPLE_MANIFEST.works[0];
    const fixture = approvedCoverFixture({
      workId: work.workId,
      editionId: editionIds[work.workId],
      suffix: "square-warning",
      qualityScore: 100,
    });
    fixture.inspection.flags = ["square_canvas"];
    const created = createCoverCandidateSqlite(raw, fixture);

    expect(created.state).toBe("review_required");
    expect(getCoverSelectionSqlite(raw, work.workId).objectKey).toBe(
      PLACEHOLDER_COVER,
    );
    expect(() =>
      reviewCoverCandidateSqlite(raw, {
        candidateId: created.candidateId,
        reviewerRef: "user:cover-reviewer",
        decision: "approve",
        reason: "Reviewed crop in the diagnostic fixture",
        acknowledgedWarningCodes: [],
        reviewedAt: NOW,
      }),
    ).toThrow("warnings not acknowledged");

    reviewCoverCandidateSqlite(raw, {
      candidateId: created.candidateId,
      reviewerRef: "user:cover-reviewer",
      decision: "approve",
      reason: "Reviewed crop in the diagnostic fixture",
      acknowledgedWarningCodes: ["square_canvas"],
      reviewedAt: NOW + 1,
    });
    expect(getCoverSelectionSqlite(raw, work.workId)).toMatchObject({
      candidateId: created.candidateId,
      representationType: "selected_edition",
      editionId: editionIds[work.workId],
      publicDisplayEligible: false,
    });
  });

  it("chooses deterministically and prefers exact selected-edition evidence", () => {
    const work = ENRICHMENT_SAMPLE_MANIFEST.works[0];
    const exact = approvedCoverFixture({
      workId: work.workId,
      editionId: editionIds[work.workId],
      suffix: "exact-low-score",
      qualityScore: 70,
    });
    const representative = approvedCoverFixture({
      workId: work.workId,
      editionId: editionIds[work.workId],
      suffix: "work-high-score",
      qualityScore: 100,
    });
    representative.candidate.editionId = null;
    representative.candidate.representationType = "work_representative";
    representative.candidate.identityMatchKind = "curated_work_relation";

    createCoverCandidateSqlite(raw, representative);
    const exactResult = createCoverCandidateSqlite(raw, exact);

    expect(getCoverSelectionSqlite(raw, work.workId)).toMatchObject({
      candidateId: exactResult.candidateId,
      representationType: "selected_edition",
      objectKey: exact.candidate.objectKey,
    });
  });

  it("flags duplicate bytes without allowing arrival order to choose the winner", () => {
    const work = ENRICHMENT_SAMPLE_MANIFEST.works[0];
    const first = approvedCoverFixture({
      workId: work.workId,
      editionId: editionIds[work.workId],
      suffix: "duplicate-a",
    });
    const second = approvedCoverFixture({
      workId: work.workId,
      editionId: editionIds[work.workId],
      suffix: "duplicate-b",
    });
    second.inspection.checksum = first.inspection.checksum;
    createCoverCandidateSqlite(raw, first);
    const duplicate = createCoverCandidateSqlite(raw, second);

    expect(duplicate.warningCodes).toContain("duplicate");
    expect(
      raw
        .prepare(
          `select duplicate_of_candidate_id as duplicateOf
           from cover_inspections where candidate_id = ?`,
        )
        .get(duplicate.candidateId),
    ).toEqual({ duplicateOf: expect.any(String) });
    const forwardWinner = getCoverSelectionSqlite(raw, work.workId).candidateId;

    const reversePath = path.join(directory, "covers-reverse.sqlite");
    rebuildCatalogSqlite({
      sqlitePath: reversePath,
      graph: buildCatalogImportGraph(SAMPLE_BASELINE_IMPORT_RECORDS),
    });
    const reverse = openCatalogSqlite(reversePath).raw;
    try {
      seedCoverFixturesSqlite(reverse);
      createCoverCandidateSqlite(reverse, second);
      createCoverCandidateSqlite(reverse, first);
      expect(getCoverSelectionSqlite(reverse, work.workId).candidateId).toBe(
        forwardWinner,
      );
    } finally {
      reverse.close();
    }
  });

  it("withdraws, purges, recomputes fallback, retries purge, and rolls back", async () => {
    const work = ENRICHMENT_SAMPLE_MANIFEST.works[0];
    const fallback = approvedCoverFixture({
      workId: work.workId,
      editionId: editionIds[work.workId],
      suffix: "fallback",
      qualityScore: 80,
    });
    const preferred = approvedCoverFixture({
      workId: work.workId,
      editionId: editionIds[work.workId],
      suffix: "preferred",
      qualityScore: 95,
    });
    const fallbackResult = createCoverCandidateSqlite(raw, fallback);
    const fallbackProjection = raw
      .prepare(
        "select projection_id as id from cover_projection_heads where work_id = ?",
      )
      .get(work.workId) as { id: string };
    const preferredResult = createCoverCandidateSqlite(raw, preferred);
    const purge = vi.fn();

    await withdrawCoverCandidateSqlite(raw, {
      candidateId: preferredResult.candidateId,
      actorRef: "user:cover-withdrawal",
      reason: "Fixture rights withdrawal",
      withdrawnAt: NOW,
      purgeAsset: purge,
    });
    expect(purge).toHaveBeenCalledWith(preferred.candidate.objectKey);
    expect(getCoverSelectionSqlite(raw, work.workId).candidateId).toBe(
      fallbackResult.candidateId,
    );

    const replacement = approvedCoverFixture({
      workId: work.workId,
      editionId: editionIds[work.workId],
      suffix: "replacement",
      qualityScore: 99,
    });
    const replacementResult = createCoverCandidateSqlite(raw, replacement);
    const rolledBack = rollbackCoverProjectionSqlite(raw, {
      workId: work.workId,
      targetProjectionId: fallbackProjection.id,
      actorRef: "user:rollback-reviewer",
      reason: "Restore reviewed fallback",
      rolledBackAt: NOW + 1,
    });
    expect(rolledBack.selection).toMatchObject({
      candidateId: fallbackResult.candidateId,
      state: "rolled_back",
    });

    const failedPurge = vi
      .fn()
      .mockRejectedValueOnce(new Error("purge failed"));
    await expect(
      withdrawCoverCandidateSqlite(raw, {
        candidateId: fallbackResult.candidateId,
        actorRef: "user:cover-withdrawal",
        reason: "Withdraw fallback fixture",
        withdrawnAt: NOW + 2,
        purgeAsset: failedPurge,
      }),
    ).rejects.toThrow("purge failed");
    const retryPurge = vi.fn();
    await expect(
      retryCoverWithdrawalPurgeSqlite(raw, {
        candidateId: fallbackResult.candidateId,
        purgeAsset: retryPurge,
      }),
    ).resolves.toBe(true);
    expect(retryPurge).toHaveBeenCalledWith(fallback.candidate.objectKey);

    await withdrawCoverCandidateSqlite(raw, {
      candidateId: replacementResult.candidateId,
      actorRef: "user:cover-withdrawal",
      reason: "Withdraw final eligible fixture",
      withdrawnAt: NOW + 3,
      purgeAsset: vi.fn(),
    });
    expect(getCoverSelectionSqlite(raw, work.workId)).toMatchObject({
      candidateId: null,
      objectKey: PLACEHOLDER_COVER,
      state: "withdrawn",
    });
  });

  it("does not advance public cover relations or resolution heads", () => {
    const work = ENRICHMENT_SAMPLE_MANIFEST.works[0];
    const before = {
      relations: raw
        .prepare("select count(*) as count from edition_covers")
        .get(),
      heads: raw
        .prepare(
          `select count(*) as count from field_resolution_heads
           where field_key = 'edition.covers'`,
        )
        .get(),
    };
    createCoverCandidateSqlite(
      raw,
      approvedCoverFixture({
        workId: work.workId,
        editionId: editionIds[work.workId],
      }),
    );

    expect(
      raw.prepare("select count(*) as count from edition_covers").get(),
    ).toEqual(before.relations);
    expect(
      raw
        .prepare(
          `select count(*) as count from field_resolution_heads
           where field_key = 'edition.covers'`,
        )
        .get(),
    ).toEqual(before.heads);
  });

  it("fails closed when the current asset source policy is suspended", () => {
    const work = ENRICHMENT_SAMPLE_MANIFEST.works[0];
    createCoverCandidateSqlite(
      raw,
      approvedCoverFixture({
        workId: work.workId,
        editionId: editionIds[work.workId],
        suffix: "policy-suspension",
      }),
    );
    expect(
      getCoverSelectionSqlite(raw, work.workId).candidateId,
    ).not.toBeNull();

    raw
      .prepare(
        `update metadata_sources set approval_state = 'suspended'
         where key = 'cover_recorded_fixtures'`,
      )
      .run();

    expect(getCoverSelectionSqlite(raw, work.workId)).toMatchObject({
      candidateId: null,
      objectKey: PLACEHOLDER_COVER,
      publicDisplayEligible: false,
    });
  });
});
