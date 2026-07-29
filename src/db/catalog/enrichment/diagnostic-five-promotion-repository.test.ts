import { mkdtempSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import baseCatalog from "../../../../artifacts/catalog";
import {
  buildCatalogImportGraph,
  legacyBooksToImportRecords,
} from "../importer";
import {
  type CatalogQueryExecutor,
  createCatalogRepository,
} from "../repository";
import {
  catalogSqliteSnapshot,
  openCatalogSqlite,
  rebuildCatalogSqlite,
} from "../sqlite-rebuild";
import { APPROVED_COVER_PROPOSAL_IDS } from "./diagnostic-five-cover-promotion";
import {
  DIAGNOSTIC_FIVE_PROMOTION_APPROVAL,
  DIAGNOSTIC_FIVE_PROMOTION_APPROVAL_ID,
} from "./diagnostic-five-promotion";
import {
  promoteDiagnosticFivePostgres,
  promoteDiagnosticFiveSqlite,
  rollbackDiagnosticFiveSqlite,
} from "./diagnostic-five-promotion-repository";

const reportBytes = readFileSync(
  "docs/reports/catalog-enrichment-dry-run-2026-07-29.json",
);
const promotionInput = {
  reportBytes,
  approvalId: DIAGNOSTIC_FIVE_PROMOTION_APPROVAL_ID,
  proposalIds: DIAGNOSTIC_FIVE_PROMOTION_APPROVAL.approvedProposalIds,
  coverProposalIds: APPROVED_COVER_PROPOSAL_IDS,
  actorRef: "review:issue-143-test",
  executionTarget: "disposable",
  promotedAt: Date.UTC(2026, 6, 29, 18, 0, 0),
} as const;

describe("diagnostic-five SQLite promotion transaction", () => {
  let directory: string;
  let sqlitePath: string;

  beforeEach(() => {
    directory = mkdtempSync(path.join(tmpdir(), "bukie-promotion-test-"));
    sqlitePath = path.join(directory, "catalog.sqlite");
    rebuildCatalogSqlite({
      sqlitePath,
      graph: buildCatalogImportGraph(legacyBooksToImportRecords(baseCatalog), {
        includeApprovedPromotions: false,
      }),
    });
  });

  afterEach(() => {
    rmSync(directory, { recursive: true, force: true });
  });

  it("promotes atomically, is idempotent, and projects only four approved facts", async () => {
    const { raw } = openCatalogSqlite(sqlitePath);
    try {
      const first = promoteDiagnosticFiveSqlite(raw, promotionInput);
      const second = promoteDiagnosticFiveSqlite(raw, promotionInput);
      expect(first.changed).toBe(true);
      expect(second).toEqual({ ...first, changed: false });
      expect(
        raw
          .prepare(
            `select preferred_title as title, first_publication_date as date
             from works where first_publication_date is not null
             order by preferred_title`,
          )
          .all(),
      ).toEqual([
        { title: "Born a Crime", date: "2016" },
        { title: "Faithful Place", date: "2010" },
        { title: "Moby-Dick", date: "1851" },
        { title: "The City and the Stars", date: "1956" },
      ]);
      expect(
        raw
          .prepare(
            `select first_publication_date as date from works
             where preferred_title = 'Dune'`,
          )
          .get(),
      ).toEqual({ date: null });

      const executor: CatalogQueryExecutor = {
        dialect: "sqlite",
        async query<T extends Record<string, unknown>>(
          statement: string,
          parameters: unknown[] = [],
        ) {
          return raw.prepare(statement).all(...parameters) as T[];
        },
      };
      const repository = createCatalogRepository(executor);
      const moby = await repository.getWorkDetail(
        "00a218bd-3005-59cd-9c23-13efb48abe5a",
      );
      const dune = await repository.getWorkDetail(
        "7adeda04-34e2-5a7d-a101-de0578138b29",
      );
      expect(moby?.firstPublication).toEqual({
        date: "1851",
        precision: "year",
      });
      expect(moby?.cover).toMatchObject({
        identityScope: "work",
        rightsStatus: "deferred_poc",
        rightsCleared: false,
      });
      expect(dune?.firstPublication).toBeUndefined();
      expect(dune?.cover).toMatchObject({
        identityScope: "edition",
        rightsStatus: "deferred_poc",
        rightsCleared: false,
      });
      const diagnosticCovers = await Promise.all(
        [
          "7adeda04-34e2-5a7d-a101-de0578138b29",
          "00a218bd-3005-59cd-9c23-13efb48abe5a",
          "00a01d7f-3f29-5c95-a292-c70a4e5dbb4f",
          "03ac5ae7-dcf1-5fe7-b6ac-b8f171459fb3",
          "0100088c-3aca-5e52-9e7a-fb89192e9248",
        ].map(
          async (workId) => (await repository.getWorkDetail(workId))?.cover,
        ),
      );
      expect(
        diagnosticCovers.map((cover) => ({
          present: Boolean(cover),
          rightsCleared: cover?.rightsCleared,
        })),
      ).toEqual(
        Array.from({ length: 5 }, () => ({
          present: true,
          rightsCleared: false,
        })),
      );

      const deterministicPath = path.join(
        directory,
        "deterministic-rebuild.sqlite",
      );
      rebuildCatalogSqlite({
        sqlitePath: deterministicPath,
        graph: buildCatalogImportGraph(legacyBooksToImportRecords(baseCatalog)),
      });
      const deterministic = openCatalogSqlite(deterministicPath);
      try {
        const rebuilt = promoteDiagnosticFiveSqlite(
          deterministic.raw,
          promotionInput,
        );
        expect(rebuilt.changed).toBe(false);
        expect(rebuilt.publicProjectionHash).toBe(first.publicProjectionHash);
      } finally {
        deterministic.raw.close();
      }
    } finally {
      raw.close();
    }
  }, 30_000);

  it("rolls back the complete transaction after injected failures", () => {
    const { raw } = openCatalogSqlite(sqlitePath);
    try {
      const before = catalogSqliteSnapshot(raw);
      expect(() =>
        promoteDiagnosticFiveSqlite(raw, {
          ...promotionInput,
          failAfter: "resolution",
        }),
      ).toThrow("failure after resolution");
      expect(catalogSqliteSnapshot(raw).hash).toBe(before.hash);
    } finally {
      raw.close();
    }
  }, 30_000);

  it("rejects an incomplete cover allow-list before touching the transaction", () => {
    const { raw } = openCatalogSqlite(sqlitePath);
    try {
      const before = catalogSqliteSnapshot(raw);
      expect(() =>
        promoteDiagnosticFiveSqlite(raw, {
          ...promotionInput,
          coverProposalIds: APPROVED_COVER_PROPOSAL_IDS.slice(1),
        }),
      ).toThrow("allow-list is not the exact approved set");
      expect(catalogSqliteSnapshot(raw).hash).toBe(before.hash);
    } finally {
      raw.close();
    }
  }, 30_000);

  it("refuses production execution without touching a database", async () => {
    const { raw } = openCatalogSqlite(sqlitePath);
    try {
      const before = catalogSqliteSnapshot(raw);
      expect(() =>
        promoteDiagnosticFiveSqlite(raw, {
          ...promotionInput,
          executionTarget: "production" as never,
        }),
      ).toThrow("production database execution is not approved");
      expect(catalogSqliteSnapshot(raw).hash).toBe(before.hash);
    } finally {
      raw.close();
    }
    await expect(
      promoteDiagnosticFivePostgres(
        "postgresql://example.invalid/bukie_production",
        promotionInput,
      ),
    ).rejects.toThrow("production database execution is not approved");
  }, 30_000);

  it("fails closed when current policy or observation eligibility drifts", () => {
    const { raw } = openCatalogSqlite(sqlitePath);
    try {
      promoteDiagnosticFiveSqlite(raw, promotionInput);
      raw
        .prepare(
          `update metadata_sources set approval_state = 'suspended'
           where key = 'wikidata_reviewed_first_publication_issue_143'`,
        )
        .run();
      expect(() => promoteDiagnosticFiveSqlite(raw, promotionInput)).toThrow(
        "source policy or rights eligibility drifted",
      );
      raw
        .prepare(
          `update metadata_sources set approval_state = 'approved'
           where key = 'wikidata_reviewed_first_publication_issue_143'`,
        )
        .run();
      raw
        .prepare(
          `update field_observations set state = 'invalid'
           where id = (
             select o.id
             from field_observations o
             join source_records sr on sr.id = o.source_record_id
             join metadata_sources ms on ms.id = sr.source_id
             where ms.key = 'wikidata_reviewed_first_publication_issue_143'
             order by o.id limit 1
           )`,
        )
        .run();
      expect(() => promoteDiagnosticFiveSqlite(raw, promotionInput)).toThrow(
        "observation eligibility drifted",
      );
    } finally {
      raw.close();
    }
  }, 30_000);

  it("isolates the public cover projection when source eligibility drifts", async () => {
    const { raw } = openCatalogSqlite(sqlitePath);
    try {
      promoteDiagnosticFiveSqlite(raw, promotionInput);
      raw
        .prepare(
          `update metadata_sources set approval_state = 'suspended'
           where key = 'poc_reviewed_cover_sources_issue_143'`,
        )
        .run();
      const repository = createCatalogRepository({
        dialect: "sqlite",
        async query<T extends Record<string, unknown>>(
          statement: string,
          parameters: unknown[] = [],
        ) {
          return raw.prepare(statement).all(...parameters) as T[];
        },
      });
      expect(
        (await repository.getWorkDetail("00a218bd-3005-59cd-9c23-13efb48abe5a"))
          ?.cover,
      ).toBeUndefined();
      expect(() => promoteDiagnosticFiveSqlite(raw, promotionInput)).toThrow(
        "source, identity, rights, withdrawal, quality, or review eligibility drifted",
      );
    } finally {
      raw.close();
    }
  }, 30_000);

  it("appends deterministic rollback heads without deleting promotion history", () => {
    const { raw } = openCatalogSqlite(sqlitePath);
    try {
      promoteDiagnosticFiveSqlite(raw, promotionInput);
      const historyBefore = Number(
        (
          raw
            .prepare(
              `select count(*) as count from field_resolutions
               where resolver_version = ?`,
            )
            .get("diagnostic-five-first-publication-2026-07-29.v1") as {
            count: number;
          }
        ).count,
      );
      const first = rollbackDiagnosticFiveSqlite(raw, {
        actorRef: "review:issue-143-rollback-test",
        reason: "deterministic_test_rollback",
        executionTarget: "disposable",
        rolledBackAt: Date.UTC(2026, 6, 29, 19, 0, 0),
      });
      const second = rollbackDiagnosticFiveSqlite(raw, {
        actorRef: "review:issue-143-rollback-test",
        reason: "deterministic_test_rollback",
        executionTarget: "disposable",
        rolledBackAt: Date.UTC(2026, 6, 29, 19, 0, 0),
      });
      expect(first.changed).toBe(true);
      expect(second).toEqual({ ...first, changed: false });
      expect(
        raw
          .prepare(
            "select count(*) as count from works where first_publication_date is not null",
          )
          .get(),
      ).toEqual({ count: 0 });
      expect(
        raw
          .prepare(
            `select count(*) as count from field_resolutions
             where resolver_version = ?`,
          )
          .get("diagnostic-five-first-publication-2026-07-29.v1"),
      ).toEqual({ count: historyBefore });
      expect(
        raw
          .prepare(
            `select count(*) as count
             from cover_projection_heads h
             join cover_projections p on p.id = h.projection_id
             where p.state = 'placeholder'
               and p.policy_version = 'poc-cover-policy-2026-07.v1:rollback'`,
          )
          .get(),
      ).toEqual({ count: 5 });
      expect(
        raw
          .prepare(
            `select count(*) as count from cover_projections
             where policy_version = 'poc-cover-policy-2026-07.v1'`,
          )
          .get(),
      ).toEqual({ count: 10 });
    } finally {
      raw.close();
    }
  }, 30_000);
});
