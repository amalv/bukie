import { createHash } from "node:crypto";
import { mkdirSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import baseCatalog from "../../artifacts/catalog";
import {
  catalogDryRunReportBytes,
} from "../../src/db/catalog/enrichment/catalog-dry-run";
import {
  executeCatalogDryRunPostgres,
  executeCatalogDryRunSqlite,
} from "../../src/db/catalog/enrichment/catalog-dry-run-execution";
import { resolveCatalogDryRunTarget } from "../../src/db/catalog/enrichment/catalog-dry-run-safety";
import {
  buildCatalogImportGraph,
  legacyBooksToImportRecords,
} from "../../src/db/catalog/importer";

const readArg = (name: string): string | undefined => {
  const prefix = `--${name}=`;
  return process.argv
    .find((value) => value.startsWith(prefix))
    ?.slice(prefix.length);
};

const isWithin = (parent: string, candidate: string): boolean => {
  const relative = path.relative(parent, candidate);
  return (
    relative === "" ||
    (!relative.startsWith("..") && !path.isAbsolute(relative))
  );
};

const resolveReportPath = (rawPath: string | undefined): string => {
  if (!rawPath?.trim()) {
    throw new Error(
      "Catalog dry run refused: pass an explicit --report=<durable-json-path>",
    );
  }
  const resolved = path.resolve(rawPath);
  if (path.extname(resolved).toLowerCase() !== ".json") {
    throw new Error("Catalog dry run refused: report path must end in .json");
  }
  const allowed = [
    path.resolve("docs", "reports"),
    path.resolve(".data", "catalog-reports"),
    path.resolve(tmpdir()),
  ];
  if (!allowed.some((root) => isWithin(root, resolved))) {
    throw new Error(
      "Catalog dry run refused: report must be inside docs/reports, .data/catalog-reports, or the operating-system temp directory",
    );
  }
  return resolved;
};

const main = async () => {
  const target = resolveCatalogDryRunTarget({
    rawTarget: readArg("target"),
    confirmDisposable: process.argv.includes("--confirm-disposable"),
  });
  const reportPath = resolveReportPath(readArg("report"));
  const records = legacyBooksToImportRecords(baseCatalog);
  const graph = buildCatalogImportGraph(records);
  console.info("[catalog:enrichment-dry-run] validated target:", target.description);
  console.info("[catalog:enrichment-dry-run] report path:", reportPath);
  const report =
    target.driver === "sqlite"
      ? await executeCatalogDryRunSqlite({
          sqlitePath: target.path,
          records,
          graph,
        })
      : await executeCatalogDryRunPostgres({
          url: target.url,
          records,
          graph,
        });
  mkdirSync(path.dirname(reportPath), { recursive: true });
  const bytes = catalogDryRunReportBytes(report);
  writeFileSync(reportPath, bytes, "utf8");
  console.info("[catalog:enrichment-dry-run] completed:", {
    reportBytes: Buffer.byteLength(bytes),
    reportHash: createHash("sha256").update(bytes).digest("hex"),
    enrichmentHash: report.run.contentHash,
    scanned: report.counts.scanned,
    proposed: report.counts.proposed,
    queued: report.counts.queued,
    queueOverflow: report.counts.queueOverflow,
    publicWrites: report.isolation.publicWrites,
    promotionExecuted: report.run.promotionExecuted,
  });
};

main().catch((error: unknown) => {
  const message = error instanceof Error ? error.message : String(error);
  console.error("[catalog:enrichment-dry-run] failed:", message);
  process.exitCode = 1;
});
