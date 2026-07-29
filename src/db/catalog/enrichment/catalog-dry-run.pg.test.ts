import { mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { describe, expect, it } from "vitest";
import baseCatalog from "../../../../artifacts/catalog";
import {
  buildCatalogImportGraph,
  legacyBooksToImportRecords,
} from "../importer";
import { catalogDryRunReportBytes } from "./catalog-dry-run";
import {
  executeCatalogDryRunPostgres,
  executeCatalogDryRunSqlite,
} from "./catalog-dry-run-execution";
import { resolveCatalogDryRunTarget } from "./catalog-dry-run-safety";

const isolatedUrl = process.env.CATALOG_TEST_POSTGRES_URL;

describe.skipIf(!isolatedUrl)("catalog dry-run SQLite/Postgres parity", () => {
  it("produces the same normalized report from both disposable providers", async () => {
    const target = resolveCatalogDryRunTarget({
      rawTarget: `postgres:${isolatedUrl}`,
      confirmDisposable: true,
      env: { NODE_ENV: "test" },
    });
    if (target.driver !== "postgres") {
      throw new Error("Expected an isolated Postgres target");
    }
    const records = legacyBooksToImportRecords(baseCatalog);
    const graph = buildCatalogImportGraph(records);
    const sqlite = await executeCatalogDryRunSqlite({
      sqlitePath: path.join(
        mkdtempSync(path.join(tmpdir(), "bukie-catalog-dry-run-parity-")),
        "catalog-test.sqlite",
      ),
      records,
      graph,
    });
    const postgres = await executeCatalogDryRunPostgres({
      url: target.url,
      records,
      graph,
    });

    expect(catalogDryRunReportBytes(postgres)).toBe(
      catalogDryRunReportBytes(sqlite),
    );
  }, 120_000);
});
