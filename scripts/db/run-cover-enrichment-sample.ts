import {
  recordedFiveCoverFixtures,
  seedCoverFixturesSqlite,
} from "@/db/catalog/enrichment/covers/fixtures";
import {
  createCoverCandidateSqlite,
  getCoverSelectionSqlite,
} from "@/db/catalog/enrichment/covers/repository";
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
    "The issue #134 cover proof currently accepts disposable SQLite targets only",
  );
}

rebuildCatalogSqlite({
  sqlitePath: target.path,
  graph: buildCatalogImportGraph(SAMPLE_BASELINE_IMPORT_RECORDS),
});
const { raw } = openCatalogSqlite(target.path);
try {
  seedCoverFixturesSqlite(raw);
  const publicBefore = canonicalJson({
    assets: raw.prepare("select * from cover_assets order by id").all(),
    relations: raw
      .prepare(
        "select * from edition_covers order by edition_id, cover_asset_id",
      )
      .all(),
    heads: raw
      .prepare(
        `select entity_type, entity_id, field_key, resolution_id
         from field_resolution_heads
         order by entity_type, entity_id, field_key`,
      )
      .all(),
  });
  const editionIds = Object.fromEntries(
    ENRICHMENT_SAMPLE_MANIFEST.works.map((work) => {
      const edition = raw
        .prepare(
          "select preferred_edition_id as id from works where id = ?",
        )
        .get(work.workId) as { id: string };
      return [work.workId, edition.id];
    }),
  );
  const fixtures = recordedFiveCoverFixtures({ editionIds });
  const results = fixtures.map((fixture) => {
    const first = createCoverCandidateSqlite(raw, fixture);
    const retry = createCoverCandidateSqlite(raw, fixture);
    if (retry.changed || retry.candidateId !== first.candidateId) {
      throw new Error("Cover inspection retry was not idempotent");
    }
    return {
      title: fixture.title,
      state: first.state,
      gateCodes: first.gateCodes,
      warningCodes: first.warningCodes,
      selection: getCoverSelectionSqlite(raw, fixture.candidate.workId),
    };
  });
  const publicAfter = canonicalJson({
    assets: raw.prepare("select * from cover_assets order by id").all(),
    relations: raw
      .prepare(
        "select * from edition_covers order by edition_id, cover_asset_id",
      )
      .all(),
    heads: raw
      .prepare(
        `select entity_type, entity_id, field_key, resolution_id
         from field_resolution_heads
         order by entity_type, entity_id, field_key`,
      )
      .all(),
  });
  if (publicBefore !== publicAfter) {
    throw new Error("Cover proof changed public cover projections");
  }
  const snapshot = raw
    .prepare(
      `select
         c.work_id, c.representation_type, c.identity_match_kind,
         c.permission_state, c.object_key, i.media_type, i.byte_size,
         i.width, i.height, i.aspect_ratio, i.checksum, i.decode_result,
         i.flags_json, i.quality_score, d.state, d.gate_codes_json,
         d.warning_codes_json
       from cover_candidates c
       join cover_decision_heads h on h.candidate_id = c.id
       join cover_decisions d on d.id = h.decision_id
       join cover_inspections i on i.id = d.inspection_id
       order by c.work_id, c.id`,
    )
    .all();
  console.log(
    JSON.stringify(
      {
        target: target.description,
        manifest: `${ENRICHMENT_SAMPLE_MANIFEST.id}@${ENRICHMENT_SAMPLE_MANIFEST.version}`,
        snapshotHash: hashCanonicalJson(snapshot),
        results,
        safeguards: {
          catalogWideScan: false,
          currentResolutionHeadWrites: false,
          productionDataWrites: false,
          providerCalls: false,
          publicProjectionWrites: false,
        },
      },
      null,
      2,
    ),
  );
} finally {
  raw.close();
}
