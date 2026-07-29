import type Database from "better-sqlite3";
import postgres from "postgres";
import type { CatalogImportGraph, CatalogImportRecord } from "../importer";
import { rebuildCatalogPostgres } from "../postgres-rebuild";
import { openCatalogSqlite, rebuildCatalogSqlite } from "../sqlite-rebuild";
import {
  buildCatalogDryRunManifest,
  buildCatalogDryRunReport,
  CATALOG_DRY_RUN_DESCRIPTION_QUEUE_CAP,
  CATALOG_RECORDED_PROVIDER_RECORDS,
  type CatalogDryRunCoverResult,
  type CatalogDryRunDescriptionResult,
  type CatalogDryRunRehearsal,
  type CatalogDryRunReport,
} from "./catalog-dry-run";
import {
  catalogDryRunProtectedHashesPostgres,
  catalogDryRunProtectedHashesSqlite,
} from "./catalog-dry-run-snapshots";
import {
  approvedCoverFixture,
  recordedFiveCoverFixtures,
  seedCoverFixturesPostgres,
  seedCoverFixturesSqlite,
} from "./covers/fixtures";
import {
  createCoverCandidateSqlite,
  getCoverSelectionSqlite,
  retryCoverWithdrawalPurgeSqlite,
  rollbackCoverProjectionSqlite,
  withdrawCoverCandidateSqlite,
} from "./covers/repository";
import {
  createCoverCandidatePostgres,
  getCoverSelectionPostgres,
  retryCoverWithdrawalPurgePostgres,
  rollbackCoverProjectionPostgres,
  withdrawCoverCandidatePostgres,
} from "./covers/repository.pg";
import {
  modelDescriptionFixture,
  seedDescriptionFixturesPostgres,
  seedDescriptionFixturesSqlite,
} from "./descriptions/fixtures";
import { createDescriptionCandidateSqlite } from "./descriptions/repository";
import { createDescriptionCandidatePostgres } from "./descriptions/repository.pg";
import {
  enrichmentSqliteSnapshot,
  persistEnrichmentRunSqlite,
} from "./persistence";
import { persistEnrichmentRunPostgres } from "./persistence.pg";
import { ENRICHMENT_SAMPLE_MANIFEST } from "./sample-manifest";
import { buildEnrichmentRun } from "./workflow";

type SqliteDatabase = InstanceType<typeof Database>;

const DESCRIPTION_CREATED_AT = Date.UTC(2026, 6, 29, 17, 0, 0);
const REHEARSAL_AT = Date.UTC(2026, 6, 29, 18, 0, 0);

const descriptionResult = (
  workId: string,
  result: Awaited<ReturnType<typeof createDescriptionCandidatePostgres>>,
): CatalogDryRunDescriptionResult => {
  const candidate = modelDescriptionFixture(workId);
  return {
    workId,
    state: result.state,
    queue: result.queue,
    rejectionCodes: [...result.validation.rejectionCodes].sort(),
    warningCodes: [...result.validation.warningCodes].sort(),
    inputTokens: candidate.model.inputTokens,
    outputTokens: candidate.model.outputTokens,
    costMicrousd: candidate.model.costMicrousd,
    generationDurationMs: candidate.model.generationDurationMs,
  };
};

const coverResult = (
  workId: string,
  result: Awaited<ReturnType<typeof createCoverCandidatePostgres>>,
): CatalogDryRunCoverResult => ({
  workId,
  state: result.state,
  gateCodes: [...result.gateCodes].sort(),
  warningCodes: [...result.warningCodes].sort(),
});

const buildRunInputs = (
  records: readonly CatalogImportRecord[],
  graph: CatalogImportGraph,
) => {
  const manifest = buildCatalogDryRunManifest({ records, graph });
  const enrichment = buildEnrichmentRun({
    manifest,
    requestedWorkIds: manifest.works.map((work) => work.workId),
    records: CATALOG_RECORDED_PROVIDER_RECORDS,
  });
  return { enrichment, manifest };
};

const sqliteEditionIds = (
  raw: SqliteDatabase,
): Readonly<Record<string, string>> =>
  Object.fromEntries(
    ENRICHMENT_SAMPLE_MANIFEST.works.map((work) => {
      const row = raw
        .prepare("select preferred_edition_id as id from works where id = ?")
        .get(work.workId) as { id: string } | undefined;
      if (!row?.id) {
        throw new Error(
          `Catalog dry run missing preferred edition for ${work.title}`,
        );
      }
      return [work.workId, row.id];
    }),
  );

const runDescriptionsSqlite = (
  raw: SqliteDatabase,
): CatalogDryRunDescriptionResult[] => {
  seedDescriptionFixturesSqlite(raw);
  return ENRICHMENT_SAMPLE_MANIFEST.works.map((work, index) => {
    const candidate = modelDescriptionFixture(work.workId, {
      createdAt: DESCRIPTION_CREATED_AT + index,
    });
    const first = createDescriptionCandidateSqlite(raw, {
      candidate,
      queueCapacity: CATALOG_DRY_RUN_DESCRIPTION_QUEUE_CAP,
    });
    const retry = createDescriptionCandidateSqlite(raw, {
      candidate,
      queueCapacity: CATALOG_DRY_RUN_DESCRIPTION_QUEUE_CAP,
    });
    if (retry.changed || retry.candidateId !== first.candidateId) {
      throw new Error(
        `Catalog dry run description retry changed ${work.title}`,
      );
    }
    return descriptionResult(work.workId, first);
  });
};

const runCoversSqlite = (raw: SqliteDatabase): CatalogDryRunCoverResult[] => {
  seedCoverFixturesSqlite(raw);
  return recordedFiveCoverFixtures({
    editionIds: sqliteEditionIds(raw),
  }).map((fixture) => {
    const first = createCoverCandidateSqlite(raw, fixture);
    const retry = createCoverCandidateSqlite(raw, fixture);
    if (retry.changed || retry.candidateId !== first.candidateId) {
      throw new Error(`Catalog dry run cover retry changed ${fixture.title}`);
    }
    return coverResult(fixture.candidate.workId, first);
  });
};

const rehearseCoverLifecycleSqlite = async (
  raw: SqliteDatabase,
): Promise<CatalogDryRunRehearsal[]> => {
  const work = ENRICHMENT_SAMPLE_MANIFEST.works[0];
  const editionId = sqliteEditionIds(raw)[work.workId];
  const fallback = createCoverCandidateSqlite(
    raw,
    approvedCoverFixture({
      workId: work.workId,
      editionId,
      suffix: "dry-run-fallback",
      qualityScore: 80,
    }),
  );
  const fallbackProjection = raw
    .prepare(
      `select p.id
       from cover_projection_heads h
       join cover_projections p on p.id = h.projection_id
       where h.work_id = ?`,
    )
    .get(work.workId) as { id: string };
  const primary = createCoverCandidateSqlite(
    raw,
    approvedCoverFixture({
      workId: work.workId,
      editionId,
      suffix: "dry-run-primary",
      qualityScore: 95,
    }),
  );
  const selectedPrimary =
    getCoverSelectionSqlite(raw, work.workId).candidateId ===
    primary.candidateId;
  const rollback = rollbackCoverProjectionSqlite(raw, {
    workId: work.workId,
    targetProjectionId: fallbackProjection.id,
    actorRef: "system:catalog-dry-run-rehearsal",
    reason: "dry_run_rollback_rehearsal",
    rolledBackAt: REHEARSAL_AT,
  });
  let purgeFailed = false;
  try {
    await withdrawCoverCandidateSqlite(raw, {
      candidateId: fallback.candidateId,
      actorRef: "system:catalog-dry-run-rehearsal",
      reason: "dry_run_withdrawal_rehearsal",
      withdrawnAt: REHEARSAL_AT + 1,
      purgeAsset: () => {
        throw new Error("Recorded purge failure");
      },
    });
  } catch {
    purgeFailed = true;
  }
  const selectedFallback =
    getCoverSelectionSqlite(raw, work.workId).candidateId ===
    primary.candidateId;
  const purgeRetried = await retryCoverWithdrawalPurgeSqlite(raw, {
    candidateId: fallback.candidateId,
    purgeAsset: () => undefined,
  });
  return [
    {
      name: "withdrawal",
      passed: purgeFailed,
      promoted: false,
      detail:
        "A selected internal cover candidate was tombstoned while public cover relations remained protected.",
    },
    {
      name: "purge_retry",
      passed: purgeFailed && purgeRetried,
      promoted: false,
      detail:
        "A recorded purge failure remained failed until an explicit idempotent retry completed.",
    },
    {
      name: "fallback",
      passed: selectedPrimary && selectedFallback,
      promoted: false,
      detail:
        "Internal selection fell back deterministically to the next eligible retained candidate.",
    },
    {
      name: "rollback",
      passed:
        rollback.changed &&
        rollback.selection.candidateId === fallback.candidateId,
      promoted: false,
      detail:
        "Internal selection appended a rollback event to a retained prior eligible candidate.",
    },
  ];
};

const postgresEditionIds = async (
  url: string,
): Promise<Readonly<Record<string, string>>> => {
  const client = postgres(url, { max: 1 });
  try {
    const entries = await Promise.all(
      ENRICHMENT_SAMPLE_MANIFEST.works.map(async (work) => {
        const rows = await client.unsafe(
          "select preferred_edition_id as id from works where id = $1",
          [work.workId],
        );
        const id = String(rows[0]?.id ?? "");
        if (!id) {
          throw new Error(
            `Catalog dry run missing preferred edition for ${work.title}`,
          );
        }
        return [work.workId, id] as const;
      }),
    );
    return Object.fromEntries(entries);
  } finally {
    await client.end({ timeout: 5_000 });
  }
};

const runDescriptionsPostgres = async (
  url: string,
): Promise<CatalogDryRunDescriptionResult[]> => {
  await seedDescriptionFixturesPostgres(url);
  const results: CatalogDryRunDescriptionResult[] = [];
  for (const [index, work] of ENRICHMENT_SAMPLE_MANIFEST.works.entries()) {
    const candidate = modelDescriptionFixture(work.workId, {
      createdAt: DESCRIPTION_CREATED_AT + index,
    });
    const first = await createDescriptionCandidatePostgres({
      url,
      candidate,
      queueCapacity: CATALOG_DRY_RUN_DESCRIPTION_QUEUE_CAP,
    });
    const retry = await createDescriptionCandidatePostgres({
      url,
      candidate,
      queueCapacity: CATALOG_DRY_RUN_DESCRIPTION_QUEUE_CAP,
    });
    if (retry.changed || retry.candidateId !== first.candidateId) {
      throw new Error(
        `Catalog dry run description retry changed ${work.title}`,
      );
    }
    results.push(descriptionResult(work.workId, first));
  }
  return results;
};

const runCoversPostgres = async (
  url: string,
): Promise<CatalogDryRunCoverResult[]> => {
  await seedCoverFixturesPostgres(url);
  const fixtures = recordedFiveCoverFixtures({
    editionIds: await postgresEditionIds(url),
  });
  const results: CatalogDryRunCoverResult[] = [];
  for (const fixture of fixtures) {
    const first = await createCoverCandidatePostgres({ url, ...fixture });
    const retry = await createCoverCandidatePostgres({ url, ...fixture });
    if (retry.changed || retry.candidateId !== first.candidateId) {
      throw new Error(`Catalog dry run cover retry changed ${fixture.title}`);
    }
    results.push(coverResult(fixture.candidate.workId, first));
  }
  return results;
};

const currentCoverProjectionIdPostgres = async (
  url: string,
  workId: string,
): Promise<string> => {
  const client = postgres(url, { max: 1 });
  try {
    const rows = await client.unsafe(
      `select p.id
       from cover_projection_heads h
       join cover_projections p on p.id = h.projection_id
       where h.work_id = $1`,
      [workId],
    );
    const id = String(rows[0]?.id ?? "");
    if (!id) throw new Error("Catalog dry run cover projection not found");
    return id;
  } finally {
    await client.end({ timeout: 5_000 });
  }
};

const rehearseCoverLifecyclePostgres = async (
  url: string,
): Promise<CatalogDryRunRehearsal[]> => {
  const work = ENRICHMENT_SAMPLE_MANIFEST.works[0];
  const editionId = (await postgresEditionIds(url))[work.workId];
  const fallback = await createCoverCandidatePostgres({
    url,
    ...approvedCoverFixture({
      workId: work.workId,
      editionId,
      suffix: "dry-run-fallback",
      qualityScore: 80,
    }),
  });
  const fallbackProjectionId = await currentCoverProjectionIdPostgres(
    url,
    work.workId,
  );
  const primary = await createCoverCandidatePostgres({
    url,
    ...approvedCoverFixture({
      workId: work.workId,
      editionId,
      suffix: "dry-run-primary",
      qualityScore: 95,
    }),
  });
  const selectedPrimary =
    (await getCoverSelectionPostgres({ url, workId: work.workId }))
      .candidateId === primary.candidateId;
  const rollback = await rollbackCoverProjectionPostgres({
    url,
    workId: work.workId,
    targetProjectionId: fallbackProjectionId,
    actorRef: "system:catalog-dry-run-rehearsal",
    reason: "dry_run_rollback_rehearsal",
    rolledBackAt: REHEARSAL_AT,
  });
  let purgeFailed = false;
  try {
    await withdrawCoverCandidatePostgres({
      url,
      candidateId: fallback.candidateId,
      actorRef: "system:catalog-dry-run-rehearsal",
      reason: "dry_run_withdrawal_rehearsal",
      withdrawnAt: REHEARSAL_AT + 1,
      purgeAsset: () => {
        throw new Error("Recorded purge failure");
      },
    });
  } catch {
    purgeFailed = true;
  }
  const selectedFallback =
    (await getCoverSelectionPostgres({ url, workId: work.workId }))
      .candidateId === primary.candidateId;
  const purgeRetried = await retryCoverWithdrawalPurgePostgres({
    url,
    candidateId: fallback.candidateId,
    purgeAsset: () => undefined,
  });
  return [
    {
      name: "withdrawal",
      passed: purgeFailed,
      promoted: false,
      detail:
        "A selected internal cover candidate was tombstoned while public cover relations remained protected.",
    },
    {
      name: "purge_retry",
      passed: purgeFailed && purgeRetried,
      promoted: false,
      detail:
        "A recorded purge failure remained failed until an explicit idempotent retry completed.",
    },
    {
      name: "fallback",
      passed: selectedPrimary && selectedFallback,
      promoted: false,
      detail:
        "Internal selection fell back deterministically to the next eligible retained candidate.",
    },
    {
      name: "rollback",
      passed:
        rollback.changed &&
        rollback.selection.candidateId === fallback.candidateId,
      promoted: false,
      detail:
        "Internal selection appended a rollback event to a retained prior eligible candidate.",
    },
  ];
};

export const executeCatalogDryRunSqlite = async (input: {
  sqlitePath: string;
  records: readonly CatalogImportRecord[];
  graph: CatalogImportGraph;
}): Promise<CatalogDryRunReport> => {
  const { enrichment, manifest } = buildRunInputs(input.records, input.graph);
  rebuildCatalogSqlite({ sqlitePath: input.sqlitePath, graph: input.graph });
  const { raw } = openCatalogSqlite(input.sqlitePath);
  try {
    const protectedBefore = catalogDryRunProtectedHashesSqlite(raw);
    const firstPersistence = persistEnrichmentRunSqlite(raw, enrichment);
    const firstSnapshot = enrichmentSqliteSnapshot(raw, enrichment);
    const secondPersistence = persistEnrichmentRunSqlite(raw, enrichment);
    const secondSnapshot = enrichmentSqliteSnapshot(raw, enrichment);
    if (
      firstSnapshot.hash !== secondSnapshot.hash ||
      firstPersistence.currentHeadHash !== secondPersistence.currentHeadHash
    ) {
      throw new Error(
        "Catalog dry run enrichment persistence was not idempotent",
      );
    }
    const descriptions = runDescriptionsSqlite(raw);
    const covers = runCoversSqlite(raw);
    const rehearsals = await rehearseCoverLifecycleSqlite(raw);
    if (rehearsals.some((rehearsal) => !rehearsal.passed)) {
      throw new Error("Catalog dry run lifecycle rehearsal failed");
    }
    const protectedAfter = catalogDryRunProtectedHashesSqlite(raw);
    return buildCatalogDryRunReport({
      manifest,
      graph: input.graph,
      enrichment,
      descriptions,
      covers,
      protectedBefore,
      protectedAfter,
      rehearsals,
    });
  } finally {
    raw.close();
  }
};

export const executeCatalogDryRunPostgres = async (input: {
  url: string;
  records: readonly CatalogImportRecord[];
  graph: CatalogImportGraph;
}): Promise<CatalogDryRunReport> => {
  const { enrichment, manifest } = buildRunInputs(input.records, input.graph);
  await rebuildCatalogPostgres({ url: input.url, graph: input.graph });
  const protectedBefore = await catalogDryRunProtectedHashesPostgres(input.url);
  const firstPersistence = await persistEnrichmentRunPostgres({
    url: input.url,
    run: enrichment,
  });
  const secondPersistence = await persistEnrichmentRunPostgres({
    url: input.url,
    run: enrichment,
  });
  if (
    firstPersistence.currentHeadHash !== secondPersistence.currentHeadHash ||
    Object.values(secondPersistence.created).some((count) => count !== 0)
  ) {
    throw new Error(
      "Catalog dry run enrichment persistence was not idempotent",
    );
  }
  const descriptions = await runDescriptionsPostgres(input.url);
  const covers = await runCoversPostgres(input.url);
  const rehearsals = await rehearseCoverLifecyclePostgres(input.url);
  if (rehearsals.some((rehearsal) => !rehearsal.passed)) {
    throw new Error("Catalog dry run lifecycle rehearsal failed");
  }
  const protectedAfter = await catalogDryRunProtectedHashesPostgres(input.url);
  return buildCatalogDryRunReport({
    manifest,
    graph: input.graph,
    enrichment,
    descriptions,
    covers,
    protectedBefore,
    protectedAfter,
    rehearsals,
  });
};
