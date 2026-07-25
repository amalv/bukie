#!/usr/bin/env bun
import { execFile } from "node:child_process";
import { stat } from "node:fs/promises";
import path from "node:path";
import { promisify } from "node:util";

const FILE_GUARDRAIL = 2500;
const SIZE_GUARDRAIL_BYTES = 250 * 1024 * 1024;
const execFileAsync = promisify(execFile);

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(2)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
}

async function main() {
  const { stdout: output } = await execFileAsync(
    "git",
    ["ls-files", "--", "public/covers"],
    { encoding: "utf8" },
  );

  const entries = output
    .split(/\r?\n/)
    .map((entry) => entry.trim())
    .filter(Boolean);
  let fileCount = 0;
  let totalBytes = 0;

  for (const entry of entries) {
    const fullPath = path.join(process.cwd(), entry);
    const entryStat = await stat(fullPath);
    if (!entryStat.isFile()) continue;
    fileCount += 1;
    totalBytes += entryStat.size;
  }

  const filePercent = ((fileCount / FILE_GUARDRAIL) * 100).toFixed(1);
  const sizePercent = ((totalBytes / SIZE_GUARDRAIL_BYTES) * 100).toFixed(1);

  console.log("Bukie cover footprint");
  console.log(
    `- files: ${fileCount} / ${FILE_GUARDRAIL} (${filePercent}% of ADR guardrail)`,
  );
  console.log(
    `- size:  ${formatBytes(totalBytes)} / ${formatBytes(SIZE_GUARDRAIL_BYTES)} (${sizePercent}% of ADR guardrail)`,
  );
  console.log(
    `- status: ${
      fileCount > FILE_GUARDRAIL || totalBytes > SIZE_GUARDRAIL_BYTES
        ? "migration planning threshold exceeded"
        : "within current ADR 0015 thresholds"
    }`,
  );
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
