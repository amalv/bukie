import { readFileSync } from "node:fs";
import postgres from "postgres";
import { describe, expect, it } from "vitest";
import baseCatalog from "../../../../artifacts/catalog";
import {
  buildCatalogImportGraph,
  legacyBooksToImportRecords,
} from "../importer";
import { rebuildCatalogPostgres } from "../postgres-rebuild";
import { resolveRebuildTarget } from "../rebuild-safety";
import { APPROVED_COVER_PROPOSAL_IDS } from "./diagnostic-five-cover-promotion";
import {
  DIAGNOSTIC_FIVE_PROMOTION_APPROVAL,
  DIAGNOSTIC_FIVE_PROMOTION_APPROVAL_ID,
} from "./diagnostic-five-promotion";
import {
  promoteDiagnosticFivePostgres,
  rollbackDiagnosticFivePostgres,
} from "./diagnostic-five-promotion-repository";

const isolatedUrl = process.env.CATALOG_TEST_POSTGRES_URL;
const reportBytes = readFileSync(
  "docs/reports/catalog-enrichment-dry-run-2026-07-29.json",
);
const promotionInput = {
  reportBytes,
  approvalId: DIAGNOSTIC_FIVE_PROMOTION_APPROVAL_ID,
  proposalIds: DIAGNOSTIC_FIVE_PROMOTION_APPROVAL.approvedProposalIds,
  coverProposalIds: APPROVED_COVER_PROPOSAL_IDS,
  actorRef: "review:issue-143-postgres-test",
  executionTarget: "disposable",
  promotedAt: Date.UTC(2026, 6, 29, 18, 0, 0),
} as const;

describe.skipIf(!isolatedUrl)("diagnostic-five Postgres promotion", () => {
  it("matches SQLite promotion, rollback, idempotency, and transaction semantics", async () => {
    const target = resolveRebuildTarget({
      rawTarget: `postgres:${isolatedUrl}`,
      confirmDisposable: true,
      env: { NODE_ENV: "test" },
    });
    if (target.driver !== "postgres") {
      throw new Error("Expected an isolated Postgres target");
    }
    const graph = buildCatalogImportGraph(
      legacyBooksToImportRecords(baseCatalog),
      { includeApprovedPromotions: false },
    );
    await rebuildCatalogPostgres({ url: target.url, graph });

    await expect(
      promoteDiagnosticFivePostgres(target.url, {
        ...promotionInput,
        failAfter: "resolution",
      }),
    ).rejects.toThrow("failure after resolution");
    const client = postgres(target.url, { max: 1 });
    try {
      expect(
        Number(
          (
            await client<
              Array<{ count: string }>
            >`select count(*)::text as count from works where first_publication_date is not null`
          )[0]?.count ?? -1,
        ),
      ).toBe(0);
    } finally {
      await client.end({ timeout: 5_000 });
    }

    const first = await promoteDiagnosticFivePostgres(
      target.url,
      promotionInput,
    );
    const second = await promoteDiagnosticFivePostgres(
      target.url,
      promotionInput,
    );
    expect(first.changed).toBe(true);
    expect(second).toEqual({ ...first, changed: false });

    const projectionClient = postgres(target.url, { max: 1 });
    try {
      expect(
        await projectionClient<
          Array<{ title: string; date: string }>
        >`select preferred_title as title, first_publication_date as date
          from works where first_publication_date is not null
          order by preferred_title`,
      ).toEqual([
        { title: "Born a Crime", date: "2016" },
        { title: "Faithful Place", date: "2010" },
        { title: "Moby-Dick", date: "1851" },
        { title: "The City and the Stars", date: "1956" },
      ]);
    } finally {
      await projectionClient.end({ timeout: 5_000 });
    }

    const rolledBack = await rollbackDiagnosticFivePostgres(target.url, {
      actorRef: "review:issue-143-postgres-rollback",
      reason: "postgres_parity_rollback",
      executionTarget: "disposable",
      rolledBackAt: Date.UTC(2026, 6, 29, 19, 0, 0),
    });
    const rollbackRetry = await rollbackDiagnosticFivePostgres(target.url, {
      actorRef: "review:issue-143-postgres-rollback",
      reason: "postgres_parity_rollback",
      executionTarget: "disposable",
      rolledBackAt: Date.UTC(2026, 6, 29, 19, 0, 0),
    });
    expect(rolledBack.changed).toBe(true);
    expect(rollbackRetry).toEqual({ ...rolledBack, changed: false });
  }, 120_000);
});
