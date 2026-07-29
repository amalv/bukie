import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { buildCatalogImportGraph } from "../../importer";
import { createCatalogRepository } from "../../repository";
import { openCatalogSqlite, rebuildCatalogSqlite } from "../../sqlite-rebuild";
import { SAMPLE_BASELINE_IMPORT_RECORDS } from "../fixtures";
import { ENRICHMENT_SAMPLE_MANIFEST } from "../sample-manifest";
import {
  DESCRIPTION_FIXTURE_ALTERNATE_TEXT,
  DESCRIPTION_FIXTURE_SOURCE_ID,
  DESCRIPTION_FIXTURE_TEXT,
  descriptionFixtureIds,
  editorialDescriptionFixture,
  licensedDescriptionFixture,
  modelDescriptionFixture,
  seedDescriptionFixturesSqlite,
} from "./fixtures";
import {
  createDescriptionCandidateSqlite,
  descriptionMetricsSqlite,
  getDescriptionProposalSqlite,
  invalidateDescriptionCandidateSqlite,
  reconcileDescriptionCandidateSqlite,
  requestDescriptionRereviewSqlite,
  retryDescriptionQueueSqlite,
  reviewDescriptionCandidateSqlite,
  rollbackDescriptionProjectionSqlite,
  withdrawDescriptionCandidateSqlite,
} from "./repository";
import { DESCRIPTION_POLICY_VERSION } from "./types";

const NOW = Date.UTC(2026, 6, 29, 10, 0, 0);

const acknowledge = (
  result: ReturnType<typeof createDescriptionCandidateSqlite>,
) => result.validation.warningCodes;

describe("SQLite evidence-gated description repository", () => {
  let directory: string;
  let raw: ReturnType<typeof openCatalogSqlite>["raw"];

  beforeEach(() => {
    directory = mkdtempSync(path.join(tmpdir(), "bukie-descriptions-test-"));
    const sqlitePath = path.join(directory, "descriptions.sqlite");
    rebuildCatalogSqlite({
      sqlitePath,
      graph: buildCatalogImportGraph(SAMPLE_BASELINE_IMPORT_RECORDS),
    });
    raw = openCatalogSqlite(sqlitePath).raw;
    seedDescriptionFixturesSqlite(raw);
  });

  afterEach(() => {
    raw.close();
    rmSync(directory, { recursive: true, force: true });
  });

  it("keeps an initial model result queued until an explicit human approval", () => {
    const candidate = modelDescriptionFixture();
    const first = createDescriptionCandidateSqlite(raw, {
      candidate,
      queueCapacity: 3,
    });
    const retry = createDescriptionCandidateSqlite(raw, {
      candidate,
      queueCapacity: 3,
    });

    expect(first.state).toBe("review_required");
    expect(first.queue).toBe("queued");
    expect(first.validation.warningCodes).toContain("initial_model_review");
    expect(retry.changed).toBe(false);
    expect(retry.queue).toBe("deduplicated");
    raw
      .prepare(
        "update description_candidates set quality_score = 100 where id = ?",
      )
      .run(first.candidateId);
    expect(
      getDescriptionProposalSqlite(raw, {
        workId: candidate.workId,
        descriptionPolicyVersion: DESCRIPTION_POLICY_VERSION,
        currentModelVersion: candidate.model.modelVersion,
        currentPromptVersion: candidate.model.promptVersion,
      }),
    ).toBeUndefined();
    expect(() =>
      reviewDescriptionCandidateSqlite(raw, {
        candidateId: first.candidateId,
        reviewerRef: "user:reviewer-fixture",
        decision: "approve",
        reason: "Evidence and warnings reviewed",
        acknowledgedWarningCodes: [],
        reviewedAt: NOW,
      }),
    ).toThrow("warnings not acknowledged");

    const reviewed = reviewDescriptionCandidateSqlite(raw, {
      candidateId: first.candidateId,
      reviewerRef: "user:reviewer-fixture",
      decision: "approve",
      reason: "Evidence and warnings reviewed",
      acknowledgedWarningCodes: acknowledge(first),
      reviewedAt: NOW,
    });
    const repeatedReview = reviewDescriptionCandidateSqlite(raw, {
      candidateId: first.candidateId,
      reviewerRef: "user:reviewer-fixture",
      decision: "approve",
      reason: "Evidence and warnings reviewed",
      acknowledgedWarningCodes: acknowledge(first),
      reviewedAt: NOW,
    });
    const proposal = getDescriptionProposalSqlite(raw, {
      workId: candidate.workId,
      descriptionPolicyVersion: DESCRIPTION_POLICY_VERSION,
      currentModelVersion: candidate.model.modelVersion,
      currentPromptVersion: candidate.model.promptVersion,
    });

    expect(reviewed.state).toBe("eligible");
    expect(repeatedReview.changed).toBe(false);
    expect(proposal).toMatchObject({
      candidateId: first.candidateId,
      text: candidate.text,
      descriptionClass: "model_assisted_candidate",
      qualityScore: 100,
      publicDisplayEligible: false,
    });
  });

  it("records complete licensed and editorial provenance and reviewer decisions", () => {
    const licensed = createDescriptionCandidateSqlite(raw, {
      candidate: licensedDescriptionFixture(),
      queueCapacity: 3,
    });
    if (licensed.state === "review_required") {
      reviewDescriptionCandidateSqlite(raw, {
        candidateId: licensed.candidateId,
        reviewerRef: "user:licensed-reviewer",
        decision: "approve",
        reason: "License and attribution verified",
        acknowledgedWarningCodes: acknowledge(licensed),
        reviewedAt: NOW,
      });
    }
    const editorial = createDescriptionCandidateSqlite(raw, {
      candidate: editorialDescriptionFixture(),
      queueCapacity: 3,
    });
    expect(() =>
      reviewDescriptionCandidateSqlite(raw, {
        candidateId: editorial.candidateId,
        reviewerRef: "user:editor-fixture",
        decision: "approve",
        reason: "Self review is not permitted",
        acknowledgedWarningCodes: acknowledge(editorial),
        reviewedAt: NOW,
      }),
    ).toThrow("reviewer must differ from editor");
    reviewDescriptionCandidateSqlite(raw, {
      candidateId: editorial.candidateId,
      reviewerRef: "user:editorial-reviewer",
      decision: "approve",
      reason: "Evidence, wording, and revision verified",
      acknowledgedWarningCodes: acknowledge(editorial),
      reviewedAt: NOW + 1,
    });

    const rows = raw
      .prepare(
        `select
           c.description_class as class,
           c.license_name as licenseName,
           c.attribution_text as attribution,
           c.editor_ref as editorRef,
           c.editorial_reason as editorialReason,
           c.editorial_revision as editorialRevision,
           d.reviewer_ref as reviewerRef,
           d.review_reason as reviewReason
         from description_candidates c
         join description_decision_heads h on h.candidate_id = c.id
         join description_decisions d on d.id = h.decision_id
         order by c.description_class`,
      )
      .all() as Array<Record<string, string | null>>;

    expect(rows).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          class: "licensed_verbatim",
          licenseName: "Recorded fixture license",
          attribution: "Recorded fixture source",
        }),
        expect.objectContaining({
          class: "bukie_editorial",
          editorRef: "user:editor-fixture",
          editorialReason:
            "Original neutral summary based on approved fixture evidence",
          editorialRevision: "editorial-fixture-v1",
          reviewerRef: "user:editorial-reviewer",
          reviewReason: "Evidence, wording, and revision verified",
        }),
      ]),
    );
  });

  it("rejects licensed transformations unless both license and source policy permit derivatives", () => {
    const candidate = licensedDescriptionFixture(undefined, {
      text: DESCRIPTION_FIXTURE_ALTERNATE_TEXT,
      license: {
        name: "Recorded fixture license",
        url: "https://example.invalid/recorded-fixture-license",
        attributionText: "Recorded fixture source",
        derivativesPermitted: true,
        sourceText: DESCRIPTION_FIXTURE_TEXT,
        transformed: true,
      },
    });
    const result = createDescriptionCandidateSqlite(raw, {
      candidate,
      queueCapacity: 3,
    });

    expect(result.state).toBe("rejected");
    expect(result.validation.rejectionCodes).toContain(
      "licensed_derivative_not_permitted",
    );
    const missingAttribution = createDescriptionCandidateSqlite(raw, {
      candidate: licensedDescriptionFixture(undefined, {
        createdAt: NOW + 1,
        license: {
          name: "Recorded fixture license",
          url: "https://example.invalid/recorded-fixture-license",
          attributionText: null,
          derivativesPermitted: false,
          sourceText: DESCRIPTION_FIXTURE_TEXT,
          transformed: false,
        },
      }),
      queueCapacity: 3,
    });
    expect(missingAttribution.validation.rejectionCodes).toContain(
      "licensed_provenance_incomplete",
    );
  });

  it("rejects unsupported, identity-inconsistent, conflicting, and sparse evidence", () => {
    const unsupported = createDescriptionCandidateSqlite(raw, {
      candidate: modelDescriptionFixture(undefined, {
        claims: [
          {
            text: "Unsupported fixture claim",
            parentObservationIds: ["missing"],
          },
        ],
        createdAt: NOW + 10,
      }),
      queueCapacity: 3,
    });
    const otherWork = ENRICHMENT_SAMPLE_MANIFEST.works[1].workId;
    const mismatch = createDescriptionCandidateSqlite(raw, {
      candidate: modelDescriptionFixture(undefined, {
        claims: [
          {
            text: "Wrong work identity",
            parentObservationIds: [descriptionFixtureIds(otherWork).parents[0]],
          },
          {
            text: "Wrong work context",
            parentObservationIds: [descriptionFixtureIds(otherWork).parents[1]],
          },
        ],
        createdAt: NOW + 11,
      }),
      queueCapacity: 3,
    });
    const parentId = descriptionFixtureIds(
      ENRICHMENT_SAMPLE_MANIFEST.works[0].workId,
    ).parents[1];
    const conflictId = "00000000-0000-5000-8000-000000000133";
    raw
      .prepare(
        `insert into field_resolutions (
           id, entity_type, entity_id, field_key, selected_observation_id,
           state, reason, previous_resolution_id, actor_ref, resolver_version,
           resolved_at
         ) values (?, 'work', ?, 'work.first_publication_date', null,
           'conflicting', 'Fixture conflict', null, 'system:test', 'fixture-v1', ?)`,
      )
      .run(conflictId, ENRICHMENT_SAMPLE_MANIFEST.works[0].workId, NOW);
    raw
      .prepare(
        `insert into field_resolution_heads (
           entity_type, entity_id, field_key, resolution_id
         ) values ('work', ?, 'work.first_publication_date', ?)
         on conflict(entity_type, entity_id, field_key)
         do update set resolution_id = excluded.resolution_id`,
      )
      .run(ENRICHMENT_SAMPLE_MANIFEST.works[0].workId, conflictId);
    const conflict = createDescriptionCandidateSqlite(raw, {
      candidate: modelDescriptionFixture(undefined, {
        text: DESCRIPTION_FIXTURE_ALTERNATE_TEXT,
        createdAt: NOW + 12,
      }),
      queueCapacity: 3,
    });

    expect(unsupported.validation.rejectionCodes).toEqual(
      expect.arrayContaining(["claim_unsupported", "specificity_insufficient"]),
    );
    expect(mismatch.validation.rejectionCodes).toContain("identity_mismatch");
    expect(conflict.validation.rejectionCodes).toContain(
      "evidence_conflict_unresolved",
    );
    expect(parentId).toBeTruthy();
  });

  it("pauses queue overflow, deduplicates retries, and resumes only when capacity exists", () => {
    const result = createDescriptionCandidateSqlite(raw, {
      candidate: modelDescriptionFixture(),
      queueCapacity: 0,
    });
    const activeBefore = raw
      .prepare(
        `select count(*) as count from description_review_queue
         where state in ('queued', 'claimed')`,
      )
      .get() as { count: number };

    expect(result.state).toBe("paused");
    expect(result.queue).toBe("overflow_paused");
    expect(activeBefore.count).toBe(0);
    expect(
      retryDescriptionQueueSqlite(raw, {
        candidateId: result.candidateId,
        queueCapacity: 0,
        now: NOW,
      }),
    ).toBe("overflow_paused");
    expect(
      retryDescriptionQueueSqlite(raw, {
        candidateId: result.candidateId,
        queueCapacity: 1,
        now: NOW + 1,
      }),
    ).toBe("queued");
    expect(
      retryDescriptionQueueSqlite(raw, {
        candidateId: result.candidateId,
        queueCapacity: 1,
        now: NOW + 2,
      }),
    ).toBe("deduplicated");
  });

  it("fails closed on transactional candidate, review, and rollback failures", () => {
    const candidate = modelDescriptionFixture();
    expect(() =>
      createDescriptionCandidateSqlite(raw, {
        candidate,
        queueCapacity: 3,
        failAfter: "decision",
      }),
    ).toThrow("Forced description failure");
    expect(
      (
        raw
          .prepare("select count(*) as count from description_candidates")
          .get() as { count: number }
      ).count,
    ).toBe(0);
    const created = createDescriptionCandidateSqlite(raw, {
      candidate,
      queueCapacity: 3,
    });
    expect(() =>
      reviewDescriptionCandidateSqlite(raw, {
        candidateId: created.candidateId,
        reviewerRef: "user:reviewer",
        decision: "approve",
        reason: "Reviewed fixture",
        acknowledgedWarningCodes: acknowledge(created),
        reviewedAt: NOW,
        failAfter: "queue",
      }),
    ).toThrow("Forced description review failure");
    const queue = raw
      .prepare(
        "select state from description_review_queue where candidate_id = ?",
      )
      .get(created.candidateId) as { state: string };
    expect(queue.state).toBe("queued");
  });

  it("withdraws, invalidates, re-reviews, and applies policy revocation at read time", () => {
    const candidate = modelDescriptionFixture();
    const created = createDescriptionCandidateSqlite(raw, {
      candidate,
      queueCapacity: 3,
    });
    reviewDescriptionCandidateSqlite(raw, {
      candidateId: created.candidateId,
      reviewerRef: "user:reviewer",
      decision: "approve",
      reason: "Approved fixture",
      acknowledgedWarningCodes: acknowledge(created),
      reviewedAt: NOW,
    });
    const read = () =>
      getDescriptionProposalSqlite(raw, {
        workId: candidate.workId,
        descriptionPolicyVersion: DESCRIPTION_POLICY_VERSION,
        currentModelVersion: candidate.model.modelVersion,
        currentPromptVersion: candidate.model.promptVersion,
      });
    expect(read()).toBeDefined();
    raw
      .prepare(
        "update metadata_sources set approval_state = 'suspended' where id = ?",
      )
      .run(DESCRIPTION_FIXTURE_SOURCE_ID);
    expect(read()).toBeUndefined();
    expect(
      reconcileDescriptionCandidateSqlite(raw, {
        candidateId: created.candidateId,
        descriptionPolicyVersion: DESCRIPTION_POLICY_VERSION,
        currentModelVersion: candidate.model.modelVersion,
        currentPromptVersion: candidate.model.promptVersion,
        queueCapacity: 3,
        reconciledAt: NOW + 1,
      }),
    ).toBe("invalidated_source_policy");
    raw
      .prepare(
        "update metadata_sources set approval_state = 'approved' where id = ?",
      )
      .run(DESCRIPTION_FIXTURE_SOURCE_ID);
    const rereview = requestDescriptionRereviewSqlite(raw, {
      candidateId: created.candidateId,
      policyVersion: "description-gates-v2",
      queueCapacity: 3,
      requestedAt: NOW + 2,
    });
    expect(rereview.state).toBe("review_required");
    expect(read()).toBeUndefined();
    const rereviewWarnings = JSON.parse(
      (
        raw
          .prepare(
            `select d.warning_codes_json as warnings
             from description_decision_heads h
             join description_decisions d on d.id = h.decision_id
             where h.candidate_id = ?`,
          )
          .get(created.candidateId) as { warnings: string }
      ).warnings,
    );
    reviewDescriptionCandidateSqlite(raw, {
      candidateId: created.candidateId,
      reviewerRef: "user:reviewer-v2",
      decision: "approve",
      reason: "New policy version reviewed",
      acknowledgedWarningCodes: rereviewWarnings,
      reviewedAt: NOW + 3,
    });
    expect(
      getDescriptionProposalSqlite(raw, {
        workId: candidate.workId,
        descriptionPolicyVersion: "description-gates-v2",
        currentModelVersion: "fixture-model-v2",
        currentPromptVersion: candidate.model.promptVersion,
      }),
    ).toBeUndefined();
    expect(
      reconcileDescriptionCandidateSqlite(raw, {
        candidateId: created.candidateId,
        descriptionPolicyVersion: "description-gates-v2",
        currentModelVersion: "fixture-model-v2",
        currentPromptVersion: candidate.model.promptVersion,
        queueCapacity: 3,
        reconciledAt: NOW + 4,
      }),
    ).toBe("invalidated_model");
    const invalidated = invalidateDescriptionCandidateSqlite(raw, {
      candidateId: created.candidateId,
      reason: "Model version retired",
      policyVersion: "description-gates-v2",
      invalidatedAt: NOW + 4,
    });
    expect(invalidated.changed).toBe(false);
    const withdrawn = withdrawDescriptionCandidateSqlite(raw, {
      candidateId: created.candidateId,
      actorRef: "user:reviewer-v2",
      reason: "Source text withdrawn",
      withdrawnAt: NOW + 5,
    });
    expect(withdrawn.changed).toBe(true);
  });

  it("rolls internal dry-run projections back without touching public work projections", () => {
    const workId = ENRICHMENT_SAMPLE_MANIFEST.works[2].workId;
    const firstInput = licensedDescriptionFixture(workId, {
      sensitiveContent: true,
    });
    const first = createDescriptionCandidateSqlite(raw, {
      candidate: firstInput,
      queueCapacity: 3,
    });
    reviewDescriptionCandidateSqlite(raw, {
      candidateId: first.candidateId,
      reviewerRef: "user:first-reviewer",
      decision: "approve",
      reason: "First fixture approved",
      acknowledgedWarningCodes: acknowledge(first),
      reviewedAt: NOW,
    });
    const firstProjection = (
      raw
        .prepare(
          `select projection_id as id
           from description_projection_heads where work_id = ?`,
        )
        .get(workId) as { id: string }
    ).id;
    const secondInput = licensedDescriptionFixture(workId, {
      text: DESCRIPTION_FIXTURE_ALTERNATE_TEXT,
      createdAt: NOW + 1,
      sensitiveContent: true,
      license: {
        name: "Recorded fixture license",
        url: "https://example.invalid/recorded-fixture-license",
        attributionText: "Recorded fixture source",
        derivativesPermitted: false,
        sourceText: DESCRIPTION_FIXTURE_ALTERNATE_TEXT,
        transformed: false,
      },
    });
    const second = createDescriptionCandidateSqlite(raw, {
      candidate: secondInput,
      queueCapacity: 3,
    });
    reviewDescriptionCandidateSqlite(raw, {
      candidateId: second.candidateId,
      reviewerRef: "user:second-reviewer",
      decision: "approve",
      reason: "Second fixture approved",
      acknowledgedWarningCodes: acknowledge(second),
      reviewedAt: NOW + 2,
    });
    const headBeforeFailure = (
      raw
        .prepare(
          `select projection_id as id
           from description_projection_heads where work_id = ?`,
        )
        .get(workId) as { id: string }
    ).id;
    expect(() =>
      rollbackDescriptionProjectionSqlite(raw, {
        workId,
        targetProjectionId: firstProjection,
        actorRef: "user:rollback-reviewer",
        reason: "rollback_test",
        policyVersion: DESCRIPTION_POLICY_VERSION,
        rolledBackAt: NOW + 3,
        failAfter: "event",
      }),
    ).toThrow("Forced description rollback failure");
    expect(
      (
        raw
          .prepare(
            `select projection_id as id
             from description_projection_heads where work_id = ?`,
          )
          .get(workId) as { id: string }
      ).id,
    ).toBe(headBeforeFailure);
    rollbackDescriptionProjectionSqlite(raw, {
      workId,
      targetProjectionId: firstProjection,
      actorRef: "user:rollback-reviewer",
      reason: "rollback_approved",
      policyVersion: DESCRIPTION_POLICY_VERSION,
      rolledBackAt: NOW + 4,
    });
    expect(
      getDescriptionProposalSqlite(raw, {
        workId,
        descriptionPolicyVersion: DESCRIPTION_POLICY_VERSION,
      })?.candidateId,
    ).toBe(first.candidateId);
    const publicWork = raw
      .prepare("select description from works where id = ?")
      .get(workId) as { description: string | null };
    expect(publicWork.description).toBeNull();
  });

  it("reports deterministic five-work coverage, queue, token, and 500-work estimates", () => {
    const results = ENRICHMENT_SAMPLE_MANIFEST.works.map((work, index) =>
      createDescriptionCandidateSqlite(raw, {
        candidate: modelDescriptionFixture(work.workId, {
          createdAt: NOW + index,
        }),
        queueCapacity: 10,
      }),
    );
    for (let index = 0; index < 2; index += 1) {
      reviewDescriptionCandidateSqlite(raw, {
        candidateId: results[index].candidateId,
        reviewerRef: `user:metrics-reviewer-${index}`,
        decision: "approve",
        reason: "Metrics fixture approved",
        acknowledgedWarningCodes: acknowledge(results[index]),
        reviewedAt: NOW + 10 + index,
      });
    }
    reviewDescriptionCandidateSqlite(raw, {
      candidateId: results[2].candidateId,
      reviewerRef: "user:metrics-reviewer-2",
      decision: "reject",
      reason: "Metrics fixture rejected",
      reviewedAt: NOW + 12,
    });
    withdrawDescriptionCandidateSqlite(raw, {
      candidateId: results[0].candidateId,
      actorRef: "user:metrics-reviewer-0",
      reason: "Metrics fixture withdrawal",
      withdrawnAt: NOW + 13,
    });

    expect(descriptionMetricsSqlite(raw, 5)).toEqual({
      scopeWorks: 5,
      candidates: 5,
      rejected: 1,
      reviewed: 3,
      eligible: 1,
      withdrawn: 1,
      invalidated: 0,
      paused: 0,
      queue: {
        queued: 2,
        claimed: 0,
        completed: 3,
        cancelled: 0,
      },
      coverage: {
        candidateWorks: 5,
        eligibleWorks: 1,
        candidateBasisPoints: 10_000,
        eligibleBasisPoints: 2_000,
      },
      tokens: {
        input: 1_600,
        output: 560,
        total: 2_160,
      },
      costMicrousd: 21_000,
      estimate500: {
        candidates: 500,
        eligible: 100,
        inputTokens: 160_000,
        outputTokens: 56_000,
        costMicrousd: 2_100_000,
      },
      byClass: {
        licensed_verbatim: 0,
        bukie_editorial: 0,
        model_assisted_candidate: 5,
      },
    });
  });

  it("cannot expose proposed or unreviewed descriptions through detail/API repository reads", async () => {
    const candidate = modelDescriptionFixture();
    const created = createDescriptionCandidateSqlite(raw, {
      candidate,
      queueCapacity: 3,
    });
    const previous = raw
      .prepare(
        `select resolution_id as id from field_resolution_heads
         where entity_type = 'work' and entity_id = ?
           and field_key = 'work.description'`,
      )
      .get(candidate.workId) as { id: string };
    raw
      .prepare(`update metadata_sources set metadata_policy = ? where id = ?`)
      .run(
        JSON.stringify({
          display: true,
          proposedEvidenceOnly: false,
          sourcePolicyVersion: candidate.sourcePolicyVersion,
          textPermission: {
            allowedFields: ["work.description"],
            fetch: true,
            transform: false,
          },
        }),
        DESCRIPTION_FIXTURE_SOURCE_ID,
      );
    raw
      .prepare("update works set description = ? where id = ?")
      .run(candidate.text, candidate.workId);
    const forcedResolutionId = "00000000-0000-5000-8000-000000000134";
    raw
      .prepare(
        `insert into field_resolutions (
           id, entity_type, entity_id, field_key, selected_observation_id,
           state, reason, previous_resolution_id, actor_ref, resolver_version,
           resolved_at
         ) values (
           ?, 'work', ?, 'work.description', ?, 'present',
           'Forced unreviewed exposure test', ?, 'system:test',
           'forced-description-test-v1', ?
         )`,
      )
      .run(
        forcedResolutionId,
        candidate.workId,
        created.observationId,
        previous.id,
        NOW,
      );
    raw
      .prepare(
        `update field_resolution_heads set resolution_id = ?
         where entity_type = 'work' and entity_id = ?
           and field_key = 'work.description'`,
      )
      .run(forcedResolutionId, candidate.workId);
    const repository = createCatalogRepository({
      dialect: "sqlite",
      async query<T extends Record<string, unknown>>(
        statement: string,
        parameters: unknown[] = [],
      ) {
        return raw.prepare(statement).all(...parameters) as T[];
      },
    });

    const detail = await repository.getWorkDetail(candidate.workId);

    expect(detail?.description).toBeUndefined();
    reviewDescriptionCandidateSqlite(raw, {
      candidateId: created.candidateId,
      reviewerRef: "user:public-gate-reviewer",
      decision: "reject",
      reason: "Forced public gate rejection",
      reviewedAt: NOW + 1,
    });
    expect(
      (await repository.getWorkDetail(candidate.workId))?.description,
    ).toBeUndefined();
  });
});
