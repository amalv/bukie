#!/usr/bin/env bun
/**
 * Fetch high-quality covers for existing books using Open Library.
 * - Looks up by ISBN when available (future-proof), otherwise title+author heuristics.
 * - Downloads the largest image, converts to WebP via sharp, saves to public/covers.
 * - Uses the frozen catalog artifact; it never mutates runtime catalog tables.
 * - Supports --dry-run, --limit, --concurrency, --id=<legacyRecordId>.
 * - Default behavior downloads ONLY for missing covers (placeholder) to avoid unnecessary requests.
 *   Use --force to refetch even if a cover exists; use --check-files to also fetch when the DB path exists
 *   but the corresponding file is missing on disk.
 */
import { spawn } from "node:child_process";
import { mkdir, stat, writeFile } from "node:fs/promises";
import { basename, join } from "node:path";
import {
  findEditionMatchedOpenLibraryCandidates,
  getOpenLibraryHeaders,
} from "./helpers";
import { assertOpenLibraryCoverPublishingAllowed } from "./policy";
import { runCoverJobs } from "./run-cover-jobs";
import baseCatalog from "../../artifacts/catalog";
import type { LegacyCatalogArtifactRecord } from "../../artifacts/catalog/types";
import { inspectCoverBytes } from "../../src/db/catalog/enrichment/covers/inspection";
import type { CoverInspection } from "../../src/db/catalog/enrichment/covers/types";

type Flags = {
  dryRun: boolean;
  limit?: number;
  concurrency: number;
  onlyId?: string;
  noOptimize: boolean;
  uploadR2: boolean;
  force?: boolean;
  onlyMissing?: boolean; // explicit alias; default true
  checkFiles?: boolean; // also treat non-placeholder covers as missing if file not found
};

function parseFlags(argv: string[]): Flags {
  const flags: Flags = {
    dryRun: false,
    concurrency: 4,
    noOptimize: false,
    uploadR2: false,
    onlyMissing: true,
  };
  for (const arg of argv) {
    if (arg === "--dry-run") flags.dryRun = true;
    else if (arg.startsWith("--limit=")) flags.limit = Number(arg.split("=")[1]);
    else if (arg.startsWith("--concurrency=")) flags.concurrency = Number(arg.split("=")[1]);
    else if (arg.startsWith("--id=")) flags.onlyId = arg.split("=")[1];
    else if (arg === "--no-optimize") flags.noOptimize = true;
    else if (arg === "--upload-r2") flags.uploadR2 = true;
    else if (arg === "--force") flags.force = true;
    else if (arg === "--all") flags.onlyMissing = false;
    else if (arg === "--only-missing") flags.onlyMissing = true;
    else if (arg === "--check-files") flags.checkFiles = true;
  }
  return flags;
}

async function uploadCoverToR2(localPath: string): Promise<void> {
  const bucket = process.env.R2_BUCKET?.trim();
  if (!bucket) {
    throw new Error("R2_BUCKET is required when --upload-r2 is enabled.");
  }

  const filename = basename(localPath);
  const contentType = localPath.endsWith(".webp")
    ? "image/webp"
    : localPath.endsWith(".png")
      ? "image/png"
      : "image/jpeg";
  const executable = process.platform === "win32" ? "bunx.cmd" : "bunx";
  const exitCode = await new Promise<number>((resolve, reject) => {
    const child = spawn(
      executable,
      [
      "wrangler",
      "r2",
      "object",
      "put",
      `${bucket}/covers/${filename}`,
      `--file=${localPath}`,
      `--content-type=${contentType}`,
      "--cache-control=public, max-age=31536000, immutable",
      "--remote",
      ],
      { stdio: "inherit" },
    );
    child.once("error", reject);
    child.once("exit", (code) => resolve(code ?? 1));
  });
  if (exitCode !== 0) {
    throw new Error(`Wrangler upload failed with exit code ${exitCode}.`);
  }
}

let sharpSingleton: any | undefined;
async function getSharpOnce(): Promise<any> {
  if (!sharpSingleton) {
    const mod = (await import("sharp")) as any;
    sharpSingleton = mod.default ?? mod;
  }
  return sharpSingleton;
}

async function downloadCover(
  url: string,
  baseName: string,
  optimize: boolean,
): Promise<{ localPath: string; inspection: CoverInspection }> {
  const res = await fetch(url, {
    redirect: "follow",
    headers: getOpenLibraryHeaders(),
  });
  if (!res.ok) throw new Error(`download failed: ${res.status} ${res.statusText}`);
  const buf = Buffer.from(await res.arrayBuffer());
  let rel = "";
  let output = buf;
  if (optimize) {
    const sharp = await getSharpOnce();
    output = await sharp(buf).webp({ quality: 80 }).toBuffer();
    const outPath = `public/covers/${baseName}.webp`;
    const inspection = await inspectCoverBytes({
      bytes: output,
      inspectedAt: Date.now(),
    });
    if (inspection.decodeResult !== "decoded") {
      throw new Error(`cover inspection failed: ${inspection.decodeResult}`);
    }
    await mkdir(outPath.substring(0, outPath.lastIndexOf("/")), { recursive: true });
    await writeFile(outPath, output);
    rel = `/covers/${basename(outPath)}`;
    return { localPath: rel, inspection };
  } else {
    // Write original bytes with an inferred extension
    const ct = (res.headers.get("content-type") || "").toLowerCase();
    const ext = ct.includes("png") ? "png" : ct.includes("webp") ? "webp" : "jpg";
    const outPath = `public/covers/${baseName}.${ext}`;
    const inspection = await inspectCoverBytes({
      bytes: output,
      inspectedAt: Date.now(),
    });
    if (inspection.decodeResult !== "decoded") {
      throw new Error(`cover inspection failed: ${inspection.decodeResult}`);
    }
    await mkdir(outPath.substring(0, outPath.lastIndexOf("/")), { recursive: true });
    await writeFile(outPath, output);
    rel = `/covers/${basename(outPath)}`;
    return { localPath: rel, inspection };
  }
}

function isPlaceholder(cover: string | undefined): boolean {
  if (!cover) return true;
  return cover.includes("placeholder") || cover.endsWith(".svg") || cover === "/file.svg";
}

async function fileExistsForCoverPath(cover: string | undefined): Promise<boolean> {
  if (!cover) return false;
  if (!cover.startsWith("/covers/")) return false;
  const full = join(process.cwd(), "public", cover.replace(/^\//, ""));
  try {
    await stat(full);
    return true;
  } catch {
    return false;
  }
}

async function main() {
  try {
    process.loadEnvFile(join(process.cwd(), ".env"));
  } catch {
    // Environment variables may already be supplied by the calling shell.
  }

  const flags = parseFlags(process.argv.slice(2));
  if (flags.uploadR2) {
    assertOpenLibraryCoverPublishingAllowed();
  }
  const all = baseCatalog;
  let candidates = all.filter((b) => (flags.onlyId ? b.id === flags.onlyId : true));
  if (!flags.force) {
    // Default: only missing (placeholder). If --check-files, include rows whose file is missing.
    const filtered: LegacyCatalogArtifactRecord[] = [];
    for (const b of candidates) {
      if (flags.onlyMissing !== false) {
        if (isPlaceholder(b.cover)) {
          filtered.push(b);
          continue;
        }
        if (flags.checkFiles) {
          const exists = await fileExistsForCoverPath(b.cover);
          if (!exists) filtered.push(b);
        }
      } else {
        filtered.push(b);
      }
    }
    candidates = filtered;
  }

  const limited = typeof flags.limit === "number" ? candidates.slice(0, flags.limit) : candidates;
  if (limited.length === 0) {
    // eslint-disable-next-line no-console
    console.info("[covers] nothing to do");
    return;
  }

  // eslint-disable-next-line no-console
  console.info(
    "[covers] processing %d book(s)%s%s",
    limited.length,
    flags.dryRun ? " [dry-run]" : "",
    flags.force ? " [force]" : "",
  );

  await runCoverJobs(
    limited,
    flags.concurrency,
    async (book) => {
      const candidates = findEditionMatchedOpenLibraryCandidates(book);
      let usedUrl: string | undefined;
      let localPath: string | undefined;
      let inspection: CoverInspection | undefined;
      for (const candidate of candidates) {
        try {
          const downloaded = await downloadCover(
            candidate,
            book.id,
            !flags.noOptimize,
          );
          localPath = downloaded.localPath;
          inspection = downloaded.inspection;
          usedUrl = candidate;
          break;
        } catch {
          // Try the next candidate.
        }
      }
      if (!usedUrl || !localPath) {
        // eslint-disable-next-line no-console
        console.warn(
          "[covers] no match for '%s' by '%s' (%s)",
          book.title,
          book.author,
          book.id,
        );
        return;
      }
      if (flags.uploadR2 && !flags.dryRun) {
        await uploadCoverToR2(localPath.replace(/^\//, "public/"));
      }
      // eslint-disable-next-line no-console
      console.info(
        "[covers] %s -> %s%s%s",
        book.id,
        localPath,
        flags.uploadR2 && !flags.dryRun ? " [uploaded to R2]" : "",
        inspection?.flags.length
          ? ` [review:${inspection.flags.join(",")}]`
          : " [inspection:clean]",
      );
    },
    (book, error) => {
      // eslint-disable-next-line no-console
      console.error(
        "[covers] error for %s: %s",
        book.id,
        error instanceof Error ? error.message : String(error),
      );
    },
  );
}

main().catch((e) => {
  // eslint-disable-next-line no-console
  console.error("[covers] fatal", e);
  process.exit(1);
});
