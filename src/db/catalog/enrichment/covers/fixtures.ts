import type Database from "better-sqlite3";
import postgres from "postgres";
import { canonicalJson, deterministicCatalogId, sha256 } from "../../identity";
import { ENRICHMENT_SAMPLE_MANIFEST } from "../sample-manifest";
import { scoreCoverFlags } from "./inspection";
import type {
  CoverCandidateInput,
  CoverFlagCode,
  CoverInspection,
} from "./types";
import { COVER_INSPECTION_VERSION, COVER_POLICY_VERSION } from "./types";

const RECORDED_AT = Date.UTC(2026, 6, 28, 16, 0, 0);
export const COVER_FIXTURE_SOURCE_POLICY_VERSION =
  "cover-recorded-fixture-policy-v1";
export const COVER_FIXTURE_SOURCE_ID = deterministicCatalogId(
  "metadata_source",
  "cover-test",
  "recorded-fixtures",
);

const sourceRecordId = (workId: string) =>
  deterministicCatalogId("source_record", "cover-test", workId);

const fixtureTechnical = [
  {
    bytes: Math.round(18.3 * 1024),
    width: 500,
    height: 500,
    flags: [
      "square_canvas",
      "sidebars",
      "extreme_aspect_ratio",
      "extreme_crop",
      "upscaling_risk",
    ] as CoverFlagCode[],
  },
  {
    bytes: Math.round(33.4 * 1024),
    width: 327,
    height: 500,
    flags: [
      "upscaling_risk",
      "locale_conflict",
      "adaptation_conflict",
    ] as CoverFlagCode[],
  },
  {
    bytes: Math.round(39.2 * 1024),
    width: 331,
    height: 500,
    flags: ["upscaling_risk"] as CoverFlagCode[],
  },
  {
    bytes: Math.round(34.2 * 1024),
    width: 320,
    height: 500,
    flags: ["upscaling_risk"] as CoverFlagCode[],
  },
  {
    bytes: Math.round(45.4 * 1024),
    width: 330,
    height: 500,
    flags: ["upscaling_risk"] as CoverFlagCode[],
  },
] as const;

export const recordedFiveCoverFixtures = (input: {
  editionIds: Readonly<Record<string, string>>;
}): Array<{
  title: string;
  candidate: CoverCandidateInput;
  inspection: CoverInspection;
}> =>
  ENRICHMENT_SAMPLE_MANIFEST.works.map((work, index) => {
    const technical = fixtureTechnical[index];
    const isDune = work.title === "Dune";
    const isMobyDick = work.title === "Moby-Dick";
    const representationType = isDune
      ? ("selected_edition" as const)
      : ("work_representative" as const);
    const identityMatchKind =
      isDune || isMobyDick
        ? ("conflicting" as const)
        : ("title_creator_candidate" as const);
    const checksum = sha256(
      canonicalJson({
        fixture: "recorded-five-cover-audit",
        revision: "2026-07-28.v1",
        workId: work.workId,
        ...technical,
      }),
    );
    return {
      title: work.title,
      candidate: {
        workId: work.workId,
        editionId: isDune ? input.editionIds[work.workId] : null,
        sourceRecordId: sourceRecordId(work.workId),
        representationType,
        identityMatchKind,
        identityEvidence: {
          auditRevision: "docs/research/book-detail-enrichment.md@2026-07-28",
          selectedEditionIdentifiers: work.exactIdentifiers,
          finding: isDune
            ? "square movie-tie-in treatment does not reliably match the stored ISBN"
            : isMobyDick
              ? "French Delcourt adaptation conflicts with the plain Melville work"
              : "plausible work cover without strong stored edition identity",
        },
        permissionState: "pending",
        rightsBasis: null,
        attributionText: "Recorded Bukie cover audit fixture",
        attributionUrl: null,
        sourceUrl: `repository://legacy-catalog/${work.legacyRecordKey}/cover`,
        sourceRevision: `recorded-cover-audit-2026-07-28:${work.legacyRecordKey}`,
        sourcePolicyVersion: COVER_FIXTURE_SOURCE_POLICY_VERSION,
        objectKey: `/covers/${work.legacyRecordKey}.webp`,
        transformationHistory: [
          {
            operation: "legacy_webp_optimization",
            version: "unknown",
            parameters: { recordedFromExistingAsset: true },
          },
        ],
        createdAt: RECORDED_AT + index,
      },
      inspection: {
        mediaType: "image/webp",
        byteSize: technical.bytes,
        width: technical.width,
        height: technical.height,
        aspectRatio: technical.width / technical.height,
        checksum,
        decodeResult: "decoded",
        flags: [...technical.flags].sort(),
        qualityScore: scoreCoverFlags(technical.flags),
        inspectionVersion: COVER_INSPECTION_VERSION,
        inspectedAt: RECORDED_AT + index,
      },
    };
  });

export const approvedCoverFixture = (input: {
  workId: string;
  editionId: string;
  suffix?: string;
  qualityScore?: number;
}): { candidate: CoverCandidateInput; inspection: CoverInspection } => {
  const suffix = input.suffix ?? "primary";
  const checksum = sha256(`approved-cover-fixture:${input.workId}:${suffix}`);
  return {
    candidate: {
      workId: input.workId,
      editionId: input.editionId,
      sourceRecordId: sourceRecordId(input.workId),
      representationType: "selected_edition",
      identityMatchKind: "exact_isbn",
      identityEvidence: { isbn13: "9780441172719", fixture: suffix },
      permissionState: "approved",
      rightsBasis: "Recorded test fixture permission",
      attributionText: "Recorded cover fixture",
      attributionUrl: "https://example.invalid/cover-fixture",
      sourceUrl: `https://example.invalid/covers/${suffix}.webp`,
      sourceRevision: `recorded-cover-audit-2026-07-28:${ENRICHMENT_SAMPLE_MANIFEST.works.find((work) => work.workId === input.workId)?.legacyRecordKey}`,
      sourcePolicyVersion: COVER_FIXTURE_SOURCE_POLICY_VERSION,
      objectKey: `/covers/candidates/${input.workId}-${suffix}.webp`,
      transformationHistory: [],
      createdAt: RECORDED_AT + 100,
    },
    inspection: {
      mediaType: "image/webp",
      byteSize: 72_000,
      width: 600,
      height: 900,
      aspectRatio: 2 / 3,
      checksum,
      decodeResult: "decoded",
      flags: [],
      qualityScore: input.qualityScore ?? 90,
      inspectionVersion: COVER_INSPECTION_VERSION,
      inspectedAt: RECORDED_AT + 100,
    },
  };
};

const metadataPolicy = canonicalJson({
  proposedEvidenceOnly: true,
  sourcePolicyVersion: COVER_FIXTURE_SOURCE_POLICY_VERSION,
});
const assetPolicy = canonicalJson({
  attribution: { required: true },
  cache: true,
  display: true,
  fieldPermission: {
    allowedFields: ["edition.covers"],
    cache: true,
    fetch: true,
    transform: true,
  },
  proposedEvidenceOnly: true,
  purgeOnWithdrawal: true,
  sourcePolicyVersion: COVER_FIXTURE_SOURCE_POLICY_VERSION,
});

export const seedCoverFixturesSqlite = (
  raw: InstanceType<typeof Database>,
): void => {
  raw
    .prepare(
      `insert into metadata_sources (
         id, key, name, terms_url, attribution_url, reviewed_at, approval_state,
         metadata_policy, asset_policy, payload_policy, refresh_interval_ms
       ) values (?, 'cover_recorded_fixtures', 'Recorded cover inspection fixtures',
         null, 'https://example.invalid/cover-fixture', ?, 'approved', ?, ?,
         'selected_fields', null)`,
    )
    .run(COVER_FIXTURE_SOURCE_ID, RECORDED_AT, metadataPolicy, assetPolicy);
  const sourceRecord = raw.prepare(
    `insert into source_records (
       id, source_id, record_key, source_revision, source_modified_at,
       retrieved_at, payload_json, payload_hash, importer_version,
       source_row_hash, state
     ) values (?, ?, ?, ?, null, ?, null, null, 'cover-fixture-v1', ?, 'active')`,
  );
  const link = raw.prepare(
    `insert into source_record_links (
       source_record_id, entity_type, entity_id, match_kind,
       mapping_confidence, state, actor_ref, reason, created_at
     ) values (?, ?, ?, 'curated', 1, 'active',
       'system:cover-fixture', 'Recorded deterministic cover fixture', ?)`,
  );
  for (const work of ENRICHMENT_SAMPLE_MANIFEST.works) {
    const recordId = sourceRecordId(work.workId);
    const edition = raw
      .prepare("select preferred_edition_id as id from works where id = ?")
      .get(work.workId) as { id: string };
    const revision = `recorded-cover-audit-2026-07-28:${work.legacyRecordKey}`;
    sourceRecord.run(
      recordId,
      COVER_FIXTURE_SOURCE_ID,
      work.legacyRecordKey,
      revision,
      RECORDED_AT,
      sha256(revision),
    );
    for (const [entityType, entityId] of [
      ["work", work.workId],
      ["edition", edition.id],
    ] as const) {
      link.run(recordId, entityType, entityId, RECORDED_AT);
    }
  }
};

export const seedCoverFixturesPostgres = async (url: string): Promise<void> => {
  const client = postgres(url, { max: 1 });
  try {
    await client.unsafe(
      `insert into metadata_sources (
         id, key, name, terms_url, attribution_url, reviewed_at, approval_state,
         metadata_policy, asset_policy, payload_policy, refresh_interval_ms
       ) values ($1, 'cover_recorded_fixtures',
         'Recorded cover inspection fixtures', null,
         'https://example.invalid/cover-fixture', $2, 'approved',
         $3::jsonb, $4::jsonb, 'selected_fields', null)`,
      [
        COVER_FIXTURE_SOURCE_ID,
        RECORDED_AT,
        JSON.parse(metadataPolicy),
        JSON.parse(assetPolicy),
      ],
    );
    for (const work of ENRICHMENT_SAMPLE_MANIFEST.works) {
      const recordId = sourceRecordId(work.workId);
      const edition = await client.unsafe(
        "select preferred_edition_id as id from works where id = $1",
        [work.workId],
      );
      const revision = `recorded-cover-audit-2026-07-28:${work.legacyRecordKey}`;
      await client.unsafe(
        `insert into source_records (
           id, source_id, record_key, source_revision, source_modified_at,
           retrieved_at, payload_json, payload_hash, importer_version,
           source_row_hash, state
         ) values ($1, $2, $3, $4, null, $5, null, null,
           'cover-fixture-v1', $6, 'active')`,
        [
          recordId,
          COVER_FIXTURE_SOURCE_ID,
          work.legacyRecordKey,
          revision,
          RECORDED_AT,
          sha256(revision),
        ],
      );
      for (const [entityType, entityId] of [
        ["work", work.workId],
        ["edition", String(edition[0]?.id)],
      ] as const) {
        await client.unsafe(
          `insert into source_record_links (
             source_record_id, entity_type, entity_id, match_kind,
             mapping_confidence, state, actor_ref, reason, created_at
           ) values ($1, $2, $3, 'curated', 1, 'active',
             'system:cover-fixture',
             'Recorded deterministic cover fixture', $4)`,
          [recordId, entityType, entityId, RECORDED_AT],
        );
      }
    }
  } finally {
    await client.end({ timeout: 5_000 });
  }
};

export const COVER_FIXTURE_POLICY_VERSION = COVER_POLICY_VERSION;
