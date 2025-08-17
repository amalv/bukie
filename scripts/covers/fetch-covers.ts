#!/usr/bin/env bun
/**
 * Fetch high-quality covers for existing books using Open Library.
 * - Looks up by ISBN when available (future-proof), otherwise title+author heuristics.
 * - Downloads the largest image, converts to WebP via sharp, saves to public/covers.
 * - Updates DB cover field to the new local path when successful.
 * - Supports --dry-run, --limit, --concurrency, --id=<bookId>.
 */
import { mkdir, writeFile } from "node:fs/promises";
import { basename } from "node:path";
import sharp from "sharp";
import { ensureDb } from "@/db/client";
import { listBooks } from "@/db/provider";
import { updateBook } from "@/features/books/repo";
import type { Book } from "@/features/books/types";
import { buildOpenLibraryCandidates } from "./helpers";

type Flags = {
  dryRun: boolean;
  limit?: number;
  concurrency: number;
  onlyId?: string;
};

function parseFlags(argv: string[]): Flags {
  const flags: Flags = { dryRun: false, concurrency: 4 };
  for (const arg of argv) {
    if (arg === "--dry-run") flags.dryRun = true;
    else if (arg.startsWith("--limit=")) flags.limit = Number(arg.split("=")[1]);
    else if (arg.startsWith("--concurrency=")) flags.concurrency = Number(arg.split("=")[1]);
    else if (arg.startsWith("--id=")) flags.onlyId = arg.split("=")[1];
  }
  return flags;
}

async function downloadToWebp(url: string, outPath: string): Promise<void> {
  const res = await fetch(url, { redirect: "follow" });
  if (!res.ok) throw new Error(`download failed: ${res.status} ${res.statusText}`);
  const buf = Buffer.from(await res.arrayBuffer());
  const webp = await sharp(buf).webp({ quality: 80 }).toBuffer();
  await mkdir(outPath.substring(0, outPath.lastIndexOf("/")), { recursive: true });
  await writeFile(outPath, webp);
}

function isPlaceholder(cover: string | undefined): boolean {
  if (!cover) return true;
  return cover.includes("placeholder") || cover.endsWith(".svg") || cover === "/file.svg";
}

async function main() {
  const flags = parseFlags(process.argv.slice(2));
  await ensureDb();
  const all = await listBooks();
  const candidates = all
    .filter((b) => (flags.onlyId ? b.id === flags.onlyId : true))
    .filter((b) => isPlaceholder(b.cover));

  const limited = typeof flags.limit === "number" ? candidates.slice(0, flags.limit) : candidates;
  if (limited.length === 0) {
    // eslint-disable-next-line no-console
    console.info("[covers] nothing to do");
    return;
  }

  // eslint-disable-next-line no-console
  console.info("[covers] processing %d book(s)%s", limited.length, flags.dryRun ? " [dry-run]" : "");

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
            const out = `public/covers/${book.id}.webp`;
            await downloadToWebp(candidate, out);
            usedUrl = candidate;
            const localPath = `/covers/${basename(out)}`;
            if (!flags.dryRun) {
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
