/**
 * Tiny Markdown generator for importer JSON reports.
 *
 * Usage:
 *   bunx tsx ./scripts/db/report-summary.ts -- --report=./artifacts/report.json --out=./artifacts/report.md --max=10
 *   # If --out is omitted, writes to stdout
 */
import { readFile, writeFile } from "node:fs/promises";
import path from "node:path";

type PerBookResult = {
  id: string;
  title: string;
  status: "created" | "updated" | "skipped" | "dry-run" | "failed";
  reason?: string;
  warnings?: string[];
};

type BatchReport = {
  input: string;
  processed: number;
  created: number;
  updated: number;
  skipped: number;
  failed: number;
  invalidIsbn: number;
  startedAt: string;
  finishedAt: string;
  durationMs: number;
  results: PerBookResult[];
};

function parseArgs(argv: string[]) {
  const kv = Object.fromEntries(
    argv
      .slice(2)
      .filter((s) => s.startsWith("--"))
      .map((s) => s.replace(/^--/, ""))
      .map((s) => s.split("=", 2)) as Array<[string, string | undefined]>,
  ) as Record<string, string | undefined>;
  const report = kv.report ?? "";
  const out = kv.out;
  const max = Number(kv.max ?? 10) || 10;
  if (!report) throw new Error("--report=<path-to-json> is required");
  return { report, out, max };
}

function mdEscape(s: string): string {
  return s.replace(/[|`*_~<>\\]/g, "\\$&");
}

function toMd(report: BatchReport, max: number): string {
  const title = `Batch Import Summary — ${path.basename(report.input)}`;
  const lines: string[] = [];
  lines.push(`# ${title}`);
  lines.push("");
  lines.push(`- Input: ${mdEscape(report.input)}`);
  lines.push(
    `- Processed: ${report.processed} | Created: ${report.created} | Updated: ${report.updated} | Skipped: ${report.skipped} | Failed: ${report.failed} | Invalid ISBNs: ${report.invalidIsbn}`,
  );
  lines.push(
    `- Started: ${new Date(report.startedAt).toLocaleString()} | Finished: ${new Date(report.finishedAt).toLocaleString()} | Duration: ${report.durationMs} ms`,
  );
  lines.push("");

  const failed = report.results.filter((r) => r.status === "failed").slice(0, max);
  if (failed.length > 0) {
    lines.push(`## Failures (showing up to ${max})`);
    lines.push("");
    lines.push(`| id | title | reason |`);
    lines.push(`| --- | --- | --- |`);
    for (const r of failed) {
      lines.push(`| ${mdEscape(r.id)} | ${mdEscape(r.title)} | ${mdEscape(r.reason ?? "")} |`);
    }
    lines.push("");
  }

  const warned = report.results
    .filter((r) => r.warnings && r.warnings.length)
    .slice(0, max);
  if (warned.length > 0) {
    lines.push(`## Warnings (showing up to ${max} entries)`);
    lines.push("");
    for (const r of warned) {
      lines.push(`- ${mdEscape(r.id)} — ${mdEscape(r.title)}: ${mdEscape(r.warnings!.join("; "))}`);
    }
    lines.push("");
  }

  return lines.join("\n");
}

async function main() {
  const args = parseArgs(process.argv);
  const raw = await readFile(path.resolve(process.cwd(), args.report), "utf8");
  const report = JSON.parse(raw) as BatchReport;
  const md = toMd(report, args.max);
  if (args.out) {
    const out = path.resolve(process.cwd(), args.out);
    await writeFile(out, md, "utf8");
    // eslint-disable-next-line no-console
    console.log("[report-summary] written:", out);
    return;
  }
  // eslint-disable-next-line no-console
  console.log(md);
}

main().catch((e) => {
  // eslint-disable-next-line no-console
  console.error("[report-summary] fatal:", e);
  process.exit(1);
});
