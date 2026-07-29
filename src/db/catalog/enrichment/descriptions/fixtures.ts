import type Database from "better-sqlite3";
import postgres from "postgres";
import {
  canonicalJson,
  deterministicCatalogId,
  hashCanonicalJson,
} from "../../identity";
import { ENRICHMENT_SAMPLE_MANIFEST } from "../sample-manifest";
import type {
  DescriptionCandidateInput,
  EditorialDescriptionInput,
  LicensedDescriptionInput,
  ModelDescriptionInput,
} from "./types";
import { DESCRIPTION_POLICY_VERSION } from "./types";

const CREATED_AT = Date.UTC(2026, 6, 29, 9, 0, 0);
export const DESCRIPTION_FIXTURE_SOURCE_POLICY_VERSION =
  "description-candidate-fixture-policy-v1";
const EVIDENCE_POLICY_VERSION = "description-parent-evidence-policy-v1";

export const DESCRIPTION_FIXTURE_SOURCE_ID = deterministicCatalogId(
  "metadata_source",
  "description-test",
  "candidate",
);
export const DESCRIPTION_EVIDENCE_SOURCE_ID = deterministicCatalogId(
  "metadata_source",
  "description-test",
  "evidence",
);

const sourceRecordId = (workId: string, kind: "candidate" | "evidence") =>
  deterministicCatalogId(
    "source_record",
    "description-test",
    `${kind}:${workId}`,
  );

const parentObservationId = (workId: string, fieldKey: string) =>
  deterministicCatalogId(
    "field_observation",
    "description-test",
    `${workId}:${fieldKey}`,
  );

export const descriptionFixtureIds = (workId: string) => ({
  candidateSourceRecordId: sourceRecordId(workId, "candidate"),
  evidenceSourceRecordId: sourceRecordId(workId, "evidence"),
  parents: [
    parentObservationId(workId, "work.preferred_title"),
    parentObservationId(workId, "work.first_publication_date"),
    parentObservationId(workId, "work.categories"),
  ] as const,
});

const workFixture = (workId: string) => {
  const index = ENRICHMENT_SAMPLE_MANIFEST.works.findIndex(
    (work) => work.workId === workId,
  );
  const work = ENRICHMENT_SAMPLE_MANIFEST.works[index];
  if (!work) throw new Error(`Description fixture work not found: ${workId}`);
  return {
    category: `fixture-category-${index}`,
    firstPublication: String(1900 + index),
    title: work.title,
  };
};

export const descriptionFixtureText = (workId: string): string => {
  const fixture = workFixture(workId);
  return [
    `The catalog identifies this work as ${fixture.title}, using its approved work record as the sole basis for the title and identity stated here.`,
    `Its recorded first-publication context is ${fixture.firstPublication}; this fixture does not infer a more precise date, edition, publisher, setting, plot, character, or outcome.`,
    `The approved category record places the work in ${fixture.category}; no review, recommendation, popularity claim, retailer wording, publisher prose, or external synopsis is reused here.`,
    "These bounded statements are intentionally neutral and preserve the distinction between structured catalog evidence and prose that requires separate rights and editorial review.",
  ].join(" ");
};

export const descriptionFixtureAlternateText = (workId: string): string => {
  const fixture = workFixture(workId);
  return [
    `The approved catalog record names this work ${fixture.title}, and the work ID keeps that title separate from the facts of any one edition.`,
    `The work record gives ${fixture.firstPublication} as its first-publication context, with no added month, day, press, format, language, page count, plot event, or ending.`,
    `The approved category is ${fixture.category}; this text adds no rating, sales claim, praise, shop copy, source copy, outside plot summary, or claim about quality.`,
    "It stays within the few facts recorded for this test and does not guess at details that the evidence does not support.",
  ].join(" ");
};

const firstFixtureWorkId = ENRICHMENT_SAMPLE_MANIFEST.works[0].workId;
export const DESCRIPTION_FIXTURE_TEXT =
  descriptionFixtureText(firstFixtureWorkId);
export const DESCRIPTION_FIXTURE_ALTERNATE_TEXT =
  descriptionFixtureAlternateText(firstFixtureWorkId);

const claimsFor = (workId: string, text: string) => {
  const ids = descriptionFixtureIds(workId).parents;
  const claimTexts = (text.match(/[^.!?]+(?:[.!?]+|$)/gu) ?? [])
    .map((claim) => claim.trim())
    .filter(Boolean);
  return claimTexts.map((claim, index) => ({
    text: claim,
    parentObservationIds:
      index < ids.length ? [ids[index]] : [ids[0], ids[1], ids[2]],
  }));
};

const common = (
  workId: string,
  text: string,
  createdAt: number,
): Omit<
  DescriptionCandidateInput,
  "descriptionClass" | "license" | "editorial" | "model"
> => ({
  workId,
  text,
  sourceRecordId: descriptionFixtureIds(workId).candidateSourceRecordId,
  sourceRevision: "description-candidate-fixture-revision-v1",
  sourcePolicyVersion: DESCRIPTION_FIXTURE_SOURCE_POLICY_VERSION,
  descriptionPolicyVersion: DESCRIPTION_POLICY_VERSION,
  claims: claimsFor(workId, text),
  comparisonTexts: [],
  createdAt,
});

export const modelDescriptionFixture = (
  workId: string = ENRICHMENT_SAMPLE_MANIFEST.works[0].workId,
  overrides: Partial<ModelDescriptionInput> = {},
): ModelDescriptionInput => ({
  ...common(workId, descriptionFixtureText(workId), CREATED_AT),
  descriptionClass: "model_assisted_candidate",
  model: {
    modelId: "provider-neutral.recorded-fixture",
    modelVersion: "fixture-model-v1",
    promptVersion: "fixture-prompt-v1",
    generatedAt: CREATED_AT - 1_000,
    generationDurationMs: 125,
    inputTokens: 320,
    outputTokens: 112,
    costMicrousd: 4_200,
  },
  ...overrides,
});

export const editorialDescriptionFixture = (
  workId: string = ENRICHMENT_SAMPLE_MANIFEST.works[1].workId,
  overrides: Partial<EditorialDescriptionInput> = {},
): EditorialDescriptionInput => ({
  ...common(workId, descriptionFixtureText(workId), CREATED_AT + 10),
  descriptionClass: "bukie_editorial",
  editorial: {
    editorRef: "user:editor-fixture",
    reason: "Original neutral summary based on approved fixture evidence",
    revision: "editorial-fixture-v1",
  },
  ...overrides,
});

export const licensedDescriptionFixture = (
  workId: string = ENRICHMENT_SAMPLE_MANIFEST.works[2].workId,
  overrides: Partial<LicensedDescriptionInput> = {},
): LicensedDescriptionInput => ({
  ...common(workId, descriptionFixtureText(workId), CREATED_AT + 20),
  descriptionClass: "licensed_verbatim",
  license: {
    name: "Recorded fixture license",
    url: "https://example.invalid/recorded-fixture-license",
    attributionText: "Recorded fixture source",
    derivativesPermitted: false,
    sourceText: descriptionFixtureText(workId),
    transformed: false,
  },
  ...overrides,
});

export const seedDescriptionFixturesSqlite = (
  raw: InstanceType<typeof Database>,
): void => {
  const evidencePolicy = canonicalJson({
    display: true,
    proposedEvidenceOnly: false,
    sourcePolicyVersion: EVIDENCE_POLICY_VERSION,
    fieldPermission: {
      allowedFields: [
        "work.preferred_title",
        "work.first_publication_date",
        "work.categories",
      ],
    },
  });
  const candidatePolicy = canonicalJson({
    display: true,
    proposedEvidenceOnly: true,
    sourcePolicyVersion: DESCRIPTION_FIXTURE_SOURCE_POLICY_VERSION,
    attribution: {
      required: true,
    },
    textPermission: {
      allowedFields: ["work.description"],
      fetch: true,
      transform: false,
    },
  });
  const source = raw.prepare(
    `insert into metadata_sources (
       id, key, name, terms_url, attribution_url, reviewed_at, approval_state,
       metadata_policy, asset_policy, payload_policy, refresh_interval_ms
     ) values (?, ?, ?, null, null, ?, 'approved', ?, '{}', 'selected_fields', null)`,
  );
  source.run(
    DESCRIPTION_EVIDENCE_SOURCE_ID,
    "description_fixture_evidence",
    "Description fixture parent evidence",
    CREATED_AT,
    evidencePolicy,
  );
  source.run(
    DESCRIPTION_FIXTURE_SOURCE_ID,
    "description_fixture_candidates",
    "Description fixture candidate source",
    CREATED_AT,
    candidatePolicy,
  );
  const sourceRecord = raw.prepare(
    `insert into source_records (
       id, source_id, record_key, source_revision, source_modified_at,
       retrieved_at, payload_json, payload_hash, importer_version,
       source_row_hash, state
     ) values (?, ?, ?, ?, null, ?, null, null, 'description-fixture-v1', ?, 'active')`,
  );
  const link = raw.prepare(
    `insert into source_record_links (
       source_record_id, entity_type, entity_id, match_kind,
       mapping_confidence, state, actor_ref, reason, created_at
     ) values (?, 'work', ?, 'curated', 1, 'active', 'system:description-fixture', ?, ?)`,
  );
  const observation = raw.prepare(
    `insert into field_observations (
       id, source_record_id, entity_type, entity_id, field_key, value_json,
       comparison_hash, provenance_kind, source_path, source_modified_at,
       retrieved_at, mapping_confidence, state, actor_ref, reason,
       derivation_name, derivation_version, parent_ids_json
     ) values (
       ?, ?, 'work', ?, ?, ?, ?, 'curated', ?, null, ?, 1, 'active',
       'system:description-fixture', 'Approved deterministic parent evidence',
       null, null, null
     )`,
  );
  for (const [index, work] of ENRICHMENT_SAMPLE_MANIFEST.works.entries()) {
    const ids = descriptionFixtureIds(work.workId);
    sourceRecord.run(
      ids.evidenceSourceRecordId,
      DESCRIPTION_EVIDENCE_SOURCE_ID,
      `evidence:${work.workId}`,
      "description-parent-evidence-revision-v1",
      CREATED_AT + index,
      hashCanonicalJson({ kind: "evidence", workId: work.workId }),
    );
    sourceRecord.run(
      ids.candidateSourceRecordId,
      DESCRIPTION_FIXTURE_SOURCE_ID,
      `candidate:${work.workId}`,
      "description-candidate-fixture-revision-v1",
      CREATED_AT + index,
      hashCanonicalJson({ kind: "candidate", workId: work.workId }),
    );
    link.run(
      ids.evidenceSourceRecordId,
      work.workId,
      "Active identity-verified parent evidence fixture",
      CREATED_AT + index,
    );
    link.run(
      ids.candidateSourceRecordId,
      work.workId,
      "Active description candidate fixture source",
      CREATED_AT + index,
    );
    const values: Array<[string, unknown]> = [
      ["work.preferred_title", work.title],
      ["work.first_publication_date", String(1900 + index)],
      ["work.categories", [`fixture-category-${index}`]],
    ];
    for (const [fieldKey, value] of values) {
      observation.run(
        parentObservationId(work.workId, fieldKey),
        ids.evidenceSourceRecordId,
        work.workId,
        fieldKey,
        canonicalJson(value),
        hashCanonicalJson(value),
        fieldKey,
        CREATED_AT + index,
      );
    }
  }
};

export const seedDescriptionFixturesPostgres = async (
  url: string,
): Promise<void> => {
  const client = postgres(url, { max: 1 });
  const evidencePolicy = {
    display: true,
    proposedEvidenceOnly: false,
    sourcePolicyVersion: EVIDENCE_POLICY_VERSION,
    fieldPermission: {
      allowedFields: [
        "work.preferred_title",
        "work.first_publication_date",
        "work.categories",
      ],
    },
  };
  const candidatePolicy = {
    display: true,
    proposedEvidenceOnly: true,
    sourcePolicyVersion: DESCRIPTION_FIXTURE_SOURCE_POLICY_VERSION,
    attribution: {
      required: true,
    },
    textPermission: {
      allowedFields: ["work.description"],
      fetch: true,
      transform: false,
    },
  };
  try {
    await client.begin(async (sql) => {
      await sql.unsafe(
        `insert into metadata_sources (
           id, key, name, terms_url, attribution_url, reviewed_at,
           approval_state, metadata_policy, asset_policy, payload_policy,
           refresh_interval_ms
         ) values
           ($1, $2, $3, null, null, $4, 'approved', $5::jsonb, '{}'::jsonb,
            'selected_fields', null),
           ($6, $7, $8, null, null, $4, 'approved', $9::jsonb, '{}'::jsonb,
            'selected_fields', null)`,
        [
          DESCRIPTION_EVIDENCE_SOURCE_ID,
          "description_fixture_evidence",
          "Description fixture parent evidence",
          CREATED_AT,
          JSON.stringify(evidencePolicy),
          DESCRIPTION_FIXTURE_SOURCE_ID,
          "description_fixture_candidates",
          "Description fixture candidate source",
          JSON.stringify(candidatePolicy),
        ],
      );
      for (const [index, work] of ENRICHMENT_SAMPLE_MANIFEST.works.entries()) {
        const ids = descriptionFixtureIds(work.workId);
        await sql.unsafe(
          `insert into source_records (
             id, source_id, record_key, source_revision, source_modified_at,
             retrieved_at, payload_json, payload_hash, importer_version,
             source_row_hash, state
           ) values
             ($1, $2, $3, $4, null, $5, null, null,
              'description-fixture-v1', $6, 'active'),
             ($7, $8, $9, $10, null, $5, null, null,
              'description-fixture-v1', $11, 'active')`,
          [
            ids.evidenceSourceRecordId,
            DESCRIPTION_EVIDENCE_SOURCE_ID,
            `evidence:${work.workId}`,
            "description-parent-evidence-revision-v1",
            CREATED_AT + index,
            hashCanonicalJson({ kind: "evidence", workId: work.workId }),
            ids.candidateSourceRecordId,
            DESCRIPTION_FIXTURE_SOURCE_ID,
            `candidate:${work.workId}`,
            "description-candidate-fixture-revision-v1",
            hashCanonicalJson({ kind: "candidate", workId: work.workId }),
          ],
        );
        await sql.unsafe(
          `insert into source_record_links (
             source_record_id, entity_type, entity_id, match_kind,
             mapping_confidence, state, actor_ref, reason, created_at
           ) values
             ($1, 'work', $2, 'curated', 1, 'active',
              'system:description-fixture',
              'Active identity-verified parent evidence fixture', $3),
             ($4, 'work', $2, 'curated', 1, 'active',
              'system:description-fixture',
              'Active description candidate fixture source', $3)`,
          [
            ids.evidenceSourceRecordId,
            work.workId,
            CREATED_AT + index,
            ids.candidateSourceRecordId,
          ],
        );
        const values: Array<[string, unknown]> = [
          ["work.preferred_title", work.title],
          ["work.first_publication_date", String(1900 + index)],
          ["work.categories", [`fixture-category-${index}`]],
        ];
        for (const [fieldKey, value] of values) {
          await sql.unsafe(
            `insert into field_observations (
               id, source_record_id, entity_type, entity_id, field_key,
               value_json, comparison_hash, provenance_kind, source_path,
               source_modified_at, retrieved_at, mapping_confidence, state,
               actor_ref, reason, derivation_name, derivation_version,
               parent_ids_json
             ) values (
               $1, $2, 'work', $3, $4, $5::jsonb, $6, 'curated', $4, null,
               $7, 1, 'active', 'system:description-fixture',
               'Approved deterministic parent evidence', null, null, null
             )`,
            [
              parentObservationId(work.workId, fieldKey),
              ids.evidenceSourceRecordId,
              work.workId,
              fieldKey,
              JSON.stringify(value),
              hashCanonicalJson(value),
              CREATED_AT + index,
            ],
          );
        }
      }
    });
  } finally {
    await client.end({ timeout: 5_000 });
  }
};
