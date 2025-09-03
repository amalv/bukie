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
import { mkdir, writeFile, stat } from "node:fs/promises";
import { basename, join } from "node:path";
import { buildOpenLibraryCandidates } from "./helpers";
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
  seoFilenames?: boolean;
  force?: boolean;
  onlyMissing?: boolean; // explicit alias; default true
  checkFiles?: boolean; // also treat non-placeholder covers as missing if file not found
};

function parseFlags(argv: string[]): Flags {
  const flags: Flags = { dryRun: false, concurrency: 4, noOptimize: false, onlyMissing: true };
  for (const arg of argv) {
    if (arg === "--dry-run") flags.dryRun = true;
    else if (arg.startsWith("--limit=")) flags.limit = Number(arg.split("=")[1]);
    else if (arg.startsWith("--concurrency=")) flags.concurrency = Number(arg.split("=")[1]);
    else if (arg.startsWith("--id=")) flags.onlyId = arg.split("=")[1];
    else if (arg === "--no-optimize") flags.noOptimize = true;
    else if (arg === "--seo-filenames") flags.seoFilenames = true;
  else if (arg === "--force") flags.force = true;
    else if (arg === "--all") flags.onlyMissing = false;
    else if (arg === "--only-missing") flags.onlyMissing = true;
    else if (arg === "--check-files") flags.checkFiles = true;
  }
  return flags;
}

function slugify(input: string): string {
  return input
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
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
  const res = await fetch(url, { redirect: "follow" });
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

  // Simple concurrency
  const queue = [...limited];
  const workers = Array.from({ length: Math.max(1, flags.concurrency) }, async () => {
    while (queue.length) {
      const book = queue.shift() as Book | undefined;
      if (!book) break;
      try {
        const candidates = buildOpenLibraryCandidates(book);
        let usedUrl: string | undefined;
        for (const candidate of candidates) {
          try {
            const baseName = flags.seoFilenames
              ? `${book.id}-${slugify(book.title)}`
              : book.id;
            const localPath = await downloadCover(
              candidate,
              baseName,
              !flags.noOptimize,
            );
            usedUrl = candidate;
            if (!flags.dryRun && !skipDbUpdate) {
              const { updateBook } = await import("../../src/features/books/repo");
              await updateBook(book.id, { cover: localPath });
            }
            // eslint-disable-next-line no-console
            console.info("[covers] %s -> %s", book.id, localPath);
            break;
          } catch {
            // try next candidate
          }
        }
        if (!usedUrl) {
          // eslint-disable-next-line no-console
          console.warn("[covers] no match for '%s' by '%s' (%s)", book.title, book.author, book.id);
        }
      } catch (e) {
        // eslint-disable-next-line no-console
        console.error("[covers] error for %s: %s", book.id, (e as Error).message);
      }
    }
  });
  await Promise.all(workers);
}

main().catch((e) => {
  // eslint-disable-next-line no-console
  console.error("[covers] fatal", e);
  process.exit(1);
});
