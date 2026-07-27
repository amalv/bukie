#!/usr/bin/env bun
import { mkdir, stat, writeFile } from "node:fs/promises";
import path from "node:path";
import baseCatalog from "../../artifacts/catalog";
import type { LegacyCatalogArtifactRecord } from "../../artifacts/catalog/types";
import { readR2Object } from "../../src/media/r2";

type Flags = {
  concurrency: number;
  force: boolean;
  limit?: number;
  onlyId?: string;
};

function parseFlags(argv: string[]): Flags {
  const flags: Flags = { concurrency: 4, force: false };
  for (const arg of argv) {
    if (arg.startsWith("--concurrency=")) {
      flags.concurrency = Number(arg.split("=")[1]);
    } else if (arg === "--force") {
      flags.force = true;
    } else if (arg.startsWith("--id=")) {
      flags.onlyId = arg.split("=")[1];
    } else if (arg.startsWith("--limit=")) {
      flags.limit = Number(arg.split("=")[1]);
    }
  }
  return flags;
}

function toRelativeCoverPath(cover: string | undefined): string | undefined {
  if (!cover?.startsWith("/covers/")) return undefined;
  if (cover.endsWith("placeholder.svg")) return undefined;
  return cover.replace(/^\/covers\//, "");
}

async function fileExists(fullPath: string): Promise<boolean> {
  try {
    await stat(fullPath);
    return true;
  } catch {
    return false;
  }
}

async function downloadToCache(
  relativePath: string,
  cacheDir: string,
): Promise<void> {
  const targetPath = path.join(cacheDir, relativePath);
  const object = await readR2Object(
    `covers/${relativePath.replace(/^\/+/, "")}`,
  );
  if (!object) {
    throw new Error("object does not exist in R2");
  }

  await mkdir(path.dirname(targetPath), { recursive: true });
  await writeFile(targetPath, object.body);
}

async function main() {
  try {
    process.loadEnvFile(path.join(process.cwd(), ".env"));
  } catch {
    // Environment variables may already be supplied by the calling shell.
  }

  const flags = parseFlags(process.argv.slice(2));
  const cacheDir = path.resolve(".cache/covers");

  let records: LegacyCatalogArtifactRecord[] = baseCatalog.filter((record) =>
    flags.onlyId ? record.id === flags.onlyId : true,
  );
  if (typeof flags.limit === "number") records = records.slice(0, flags.limit);

  const queue = records
    .map((record) => ({
      id: record.id,
      relativePath: toRelativeCoverPath(record.cover),
    }))
    .filter(
      (entry): entry is { id: string; relativePath: string } =>
        Boolean(entry.relativePath),
    );

  if (queue.length === 0) {
    console.info("[covers:cache] nothing to hydrate");
    return;
  }

  const total = queue.length;
  let completed = 0;
  let downloaded = 0;
  let failed = 0;
  let skipped = 0;
  const reportProgress = (): void => {
    completed += 1;
    if (completed === 1 || completed % 25 === 0 || completed === total) {
      console.info("[covers:cache] progress %d / %d", completed, total);
    }
  };

  console.info(
    "[covers:cache] hydrating %d cover(s) into %s",
    total,
    cacheDir,
  );

  const workers = Array.from(
    { length: Math.max(1, flags.concurrency) },
    async () => {
      while (queue.length > 0) {
        const job = queue.shift();
        if (!job) break;

        const targetPath = path.join(cacheDir, job.relativePath);
        if (!flags.force && (await fileExists(targetPath))) {
          skipped += 1;
          reportProgress();
          continue;
        }

        try {
          await downloadToCache(job.relativePath, cacheDir);
          downloaded += 1;
        } catch (error) {
          failed += 1;
          console.warn(
            "[covers:cache] failed %s: %s",
            job.id,
            (error as Error).message,
          );
        } finally {
          reportProgress();
        }
      }
    },
  );

  await Promise.all(workers);
  console.info(
    "[covers:cache] complete downloaded=%d skipped=%d failed=%d",
    downloaded,
    skipped,
    failed,
  );
  if (failed > 0) {
    throw new Error(`${failed} cover(s) failed to hydrate.`);
  }
}

main().catch((error) => {
  console.error("[covers:cache] fatal", error);
  process.exit(1);
});
