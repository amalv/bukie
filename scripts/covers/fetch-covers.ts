#!/usr/bin/env bun
/**
 * Fetch high-quality covers for existing books using Open Library.
 * - Looks up by ISBN when available (future-proof), otherwise title+author heuristics.
 * - Downloads the largest image, converts to WebP via sharp, saves to public/covers.
 * - Updates DB cover field to the new local path when successful.
 * - Supports --dry-run, --limit, --concurrency, --id=<bookId>.
 * - Default behavior downloads ONLY for missing covers (placeholder) to avoid unnecessary requests.
 *   Use --force to refetch even if a cover exists; use --check-files to also fetch when the DB path exists
 *   but the corresponding file is missing on disk.
 *   In --dry-run mode, uses mock books instead of DB to avoid local driver issues.
 */
import { spawn } from "node:child_process";
import { mkdir, stat, writeFile } from "node:fs/promises";
import { basename, join } from "node:path";
import {
  findOpenLibraryCandidates,
  getOpenLibraryHeaders,
} from "./helpers";
import { runCoverJobs } from "./run-cover-jobs";
import { books as mockBooks } from "../../mocks/books";

type Book = {
  id: string;
  title: string;
  author: string;
  cover: string;
  isbn?: string;
  genre?: string;
  rating?: number;
  year?: number;
};

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

async function downloadCover(url: string, baseName: string, optimize: boolean): Promise<string> {
  const res = await fetch(url, {
    redirect: "follow",
    headers: getOpenLibraryHeaders(),
  });
  if (!res.ok) throw new Error(`download failed: ${res.status} ${res.statusText}`);
  const buf = Buffer.from(await res.arrayBuffer());
  let rel = "";
  if (optimize) {
    const sharp = await getSharpOnce();
    const webp = await sharp(buf).webp({ quality: 80 }).toBuffer();
    const outPath = `public/covers/${baseName}.webp`;
    await mkdir(outPath.substring(0, outPath.lastIndexOf("/")), { recursive: true });
    await writeFile(outPath, webp);
    rel = `/covers/${basename(outPath)}`;
  } else {
    // Write original bytes with an inferred extension
    const ct = (res.headers.get("content-type") || "").toLowerCase();
    const ext = ct.includes("png") ? "png" : ct.includes("webp") ? "webp" : "jpg";
    const outPath = `public/covers/${baseName}.${ext}`;
    await mkdir(outPath.substring(0, outPath.lastIndexOf("/")), { recursive: true });
    await writeFile(outPath, buf);
    rel = `/covers/${basename(outPath)}`;
  }
  return rel;
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
  let all: Book[];
  let skipDbUpdate = false;
  if (flags.dryRun) {
    // Avoid initializing DB (better-sqlite3) in Windows/Bun during dry-run
    all = mockBooks as Book[];
    skipDbUpdate = true; // never update DB during dry-run
  } else {
    try {
      const { ensureDb } = await import("../../src/db/client");
      const { listBooks } = await import("../../src/db/provider");
      await ensureDb();
      all = (await listBooks()) as Book[];
    } catch (e) {
      // eslint-disable-next-line no-console
      console.warn(
        "[covers] DB unavailable (%s). Falling back to mock data; DB updates will be skipped.",
        (e as Error).message,
      );
      all = mockBooks as Book[];
      skipDbUpdate = true;
    }
  }
  let candidates = all.filter((b) => (flags.onlyId ? b.id === flags.onlyId : true));
  if (!flags.force) {
    // Default: only missing (placeholder). If --check-files, include rows whose file is missing.
    const filtered: Book[] = [];
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
      const candidates = await findOpenLibraryCandidates(book);
      let usedUrl: string | undefined;
      let localPath: string | undefined;
      for (const candidate of candidates) {
        try {
          localPath = await downloadCover(
            candidate,
            book.id,
            !flags.noOptimize,
          );
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
      if (!flags.dryRun && !skipDbUpdate) {
        const { updateBook } = await import("../../src/features/books/repo");
        await updateBook(book.id, { cover: localPath });
      }
      // eslint-disable-next-line no-console
      console.info(
        "[covers] %s -> %s%s",
        book.id,
        localPath,
        flags.uploadR2 && !flags.dryRun ? " [uploaded to R2]" : "",
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
