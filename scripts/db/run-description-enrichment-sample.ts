import {
  modelDescriptionFixture,
  seedDescriptionFixturesSqlite,
} from "@/db/catalog/enrichment/descriptions/fixtures";
import {
  createDescriptionCandidateSqlite,
  descriptionMetricsSqlite,
  reviewDescriptionCandidateSqlite,
  withdrawDescriptionCandidateSqlite,
} from "@/db/catalog/enrichment/descriptions/repository";
import { DESCRIPTION_POLICY_VERSION } from "@/db/catalog/enrichment/descriptions/types";
import { SAMPLE_BASELINE_IMPORT_RECORDS } from "@/db/catalog/enrichment/fixtures";
import { ENRICHMENT_SAMPLE_MANIFEST } from "@/db/catalog/enrichment/sample-manifest";
import { canonicalJson, hashCanonicalJson } from "@/db/catalog/identity";
import { buildCatalogImportGraph } from "@/db/catalog/importer";
import { resolveRebuildTarget } from "@/db/catalog/rebuild-safety";
import {
  openCatalogSqlite,
  rebuildCatalogSqlite,
} from "@/db/catalog/sqlite-rebuild";

const rawTarget = process.argv
  .find((argument) => argument.startsWith("--target="))
  ?.slice("--target=".length);
const target = resolveRebuildTarget({
  rawTarget,
  confirmDisposable: process.argv.includes("--confirm-disposable"),
});
if (target.driver !== "sqlite") {
  throw new Error(
    "The issue #133 description proof currently accepts disposable SQLite targets only",
  );
}

const graph = buildCatalogImportGraph(SAMPLE_BASELINE_IMPORT_RECORDS);
rebuildCatalogSqlite({ sqlitePath: target.path, graph });
const { raw } = openCatalogSqlite(target.path);
try {
  seedDescriptionFixturesSqlite(raw);
  const publicHeadsBefore = hashCanonicalJson(
    raw
      .prepare(
        `select entity_type, entity_id, field_key, resolution_id
         from field_resolution_heads
         order by entity_type, entity_id, field_key`,
      )
      .all(),
  );
  const publicDescriptionsBefore = canonicalJson(
    raw
      .prepare("select id, description from works order by id")
      .all(),
  );
  const candidates = ENRICHMENT_SAMPLE_MANIFEST.works.map((work, index) => {
    const candidate = modelDescriptionFixture(work.workId, {
      createdAt: Date.UTC(2026, 6, 29, 13, 0, index),
    });
    const first = createDescriptionCandidateSqlite(raw, {
      candidate,
      queueCapacity: 10,
    });
    const retry = createDescriptionCandidateSqlite(raw, {
      candidate,
      queueCapacity: 10,
    });
    if (retry.changed || retry.candidateId !== first.candidateId) {
      throw new Error("Description candidate retry was not idempotent");
    }
    return first;
  });
  for (let index = 0; index < 2; index += 1) {
    reviewDescriptionCandidateSqlite(raw, {
      descriptionPolicyVersion: DESCRIPTION_POLICY_VERSION,
      currentModelVersion: "fixture-model-v1",
      currentPromptVersion: "fixture-prompt-v1",
      candidateId: candidates[index].candidateId,
      reviewerRef: `user:diagnostic-reviewer-${index}`,
      decision: "approve",
      reason: "Deterministic five-work proof approval",
      acknowledgedWarningCodes: candidates[index].validation.warningCodes,
      reviewedAt: Date.UTC(2026, 6, 29, 14, 0, index),
    });
  }
  reviewDescriptionCandidateSqlite(raw, {
    descriptionPolicyVersion: DESCRIPTION_POLICY_VERSION,
    currentModelVersion: "fixture-model-v1",
    currentPromptVersion: "fixture-prompt-v1",
    candidateId: candidates[2].candidateId,
    reviewerRef: "user:diagnostic-reviewer-2",
    decision: "reject",
    reason: "Deterministic five-work proof rejection",
    reviewedAt: Date.UTC(2026, 6, 29, 14, 0, 2),
  });
  withdrawDescriptionCandidateSqlite(raw, {
    candidateId: candidates[0].candidateId,
    actorRef: "user:diagnostic-reviewer-0",
    reason: "Deterministic five-work proof withdrawal",
    withdrawnAt: Date.UTC(2026, 6, 29, 14, 1, 0),
  });

  const publicHeadsAfter = hashCanonicalJson(
    raw
      .prepare(
        `select entity_type, entity_id, field_key, resolution_id
         from field_resolution_heads
         order by entity_type, entity_id, field_key`,
      )
      .all(),
  );
  const publicDescriptionsAfter = canonicalJson(
    raw
      .prepare("select id, description from works order by id")
      .all(),
  );
  if (publicHeadsBefore !== publicHeadsAfter) {
    throw new Error("Description proof changed public resolution heads");
  }
  if (publicDescriptionsBefore !== publicDescriptionsAfter) {
    throw new Error("Description proof changed work description projections");
  }
  const descriptionSnapshot = raw
    .prepare(
      `select
         c.id, c.work_id, c.description_class, c.text_hash,
         d.state, d.rejection_codes_json, d.warning_codes_json
       from description_candidates c
       join description_decision_heads h on h.candidate_id = c.id
       join description_decisions d on d.id = h.decision_id
       order by c.work_id, c.id`,
    )
    .all();
  console.log(
    JSON.stringify(
      {
        target: target.description,
        manifest: `${ENRICHMENT_SAMPLE_MANIFEST.id}@${ENRICHMENT_SAMPLE_MANIFEST.version}`,
        candidateIds: candidates.map((candidate) => candidate.candidateId),
        snapshotHash: hashCanonicalJson(descriptionSnapshot),
        metrics: descriptionMetricsSqlite(raw, 5),
        safeguards: {
          catalogWideScan: false,
          publicProjectionWrites: false,
          currentResolutionHeadWrites: false,
          productionDataWrites: false,
          providerCalls: false,
        },
      },
      null,
      2,
    ),
  );
} finally {
  raw.close();
}
