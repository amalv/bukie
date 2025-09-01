/**
 * Batch importer for typed mocks (mocks/books.ts).
 * - Validates and normalizes fields (ISBN-10/13, dates, author array/string)
 * - Ingests via shared ingest (replace|upsert)
 * - Flags invalid ISBNs but does not block the whole batch
 *
 * Usage (PowerShell):
 *   bunx tsx ./scripts/db/import-batch.ts -- --batch-size=100 --dry-run
 *   bunx tsx ./scripts/db/import-batch.ts -- --batch-size=100 --report=./artifacts/report-YYYY-MM-DD.json
 */
import { writeFile } from "node:fs/promises";
import path from "node:path";
import { ensureDb } from "../../src/db/client";
import type { Book } from "../../src/features/books/types";
import {
  chooseIsbn,
  isValidIsbn10,
  isValidIsbn13,
  normalizeAuthor,
} from "../../src/features/books/importer/validate";
import { ingestBooks, type IngestMode } from "../../src/db/ingest";

type InputBook = Partial<Book> & {
  id?: string;
  title: string;
  author?: string | string[];
  authors?: string[]; // alternative key
  isbn?: string;
  isbn10?: string | null;
  isbn13?: string | null;
  publishedDate?: string | number | null; // YYYY or YYYY-MM-DD
  language?: string | null;
  categories?: string[];
};

type Args = {
  batchSize: number;
  dryRun: boolean;
  report?: string;
  mode: IngestMode;
};

function parseArgs(argv: string[]): Args {
  const arg = Object.fromEntries(
    argv
      .slice(2)
      .filter((s) => s.startsWith("--"))
      .map((s) => s.replace(/^--/, ""))
      .map((kv) => kv.split("=", 2)) as Array<[string, string | undefined]>,
  ) as Record<string, string | undefined>;
  const report = arg.report;
  const batchSize = Number(arg["batch-size"] ?? arg.batchSize ?? 100) || 100;
  const dryRun = (arg["dry-run"] ?? "").toLowerCase() === "true" ||
    Object.keys(arg).includes("dry-run");
  const mode = (arg.mode === "replace" ? "replace" : "upsert") as IngestMode;
  return { batchSize, dryRun, report, mode };
}

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

async function main() {
  const args = parseArgs(process.argv);
  await ensureDb();
  const started = Date.now();
  const payload = await loadPayload();
  const items = payload.slice(0, Math.max(1, args.batchSize));

  const results: PerBookResult[] = [];
  let created = 0,
    updated = 0,
    skipped = 0,
    failed = 0,
    invalidIsbn = 0;

  const ingestPayload: Array<Omit<Book, "id"> & { id?: string }> = [];
  for (const src of items) {
    const warnings: string[] = [];
    try {
  const { randomUUID } = await import("node:crypto");
  const id = src.id?.toString().trim() || randomUUID();
      const title = (src.title ?? "").trim();
      if (!title) {
        skipped++;
        results.push({ id, title: src.title ?? "<missing>", status: "skipped", reason: "missing title" });
        continue;
      }

      // Normalize author(s)
      const authorJoined = normalizeAuthor(src.author ?? src.authors ?? []);

      // Choose and validate ISBN
      const chosenIsbn = chooseIsbn(src.isbn13 ?? null, src.isbn10 ?? null, src.isbn ?? null);
      if (chosenIsbn) {
        const ok = chosenIsbn.length === 13 ? isValidIsbn13(chosenIsbn) : chosenIsbn.length === 10 ? isValidIsbn10(chosenIsbn) : false;
        if (!ok) {
          invalidIsbn++;
          warnings.push(`invalid ISBN detected: ${chosenIsbn}`);
        }
      }

      // Map to Book shape; cover may be placeholder and updated later by covers workflow
      const bookLike: Omit<Book, "id"> & { id?: string } = {
        id,
        title,
        author: authorJoined,
        cover: src.cover?.trim() || "/covers/placeholder.webp",
        genre: src.genre,
        rating: src.rating,
        ratingsCount: src.ratingsCount,
        addedAt: src.addedAt,
        year: typeof src.year === "number" ? src.year : parseInt(String(src.publishedDate ?? src.year ?? "").slice(0, 4)) || undefined,
        description: src.description,
        pages: src.pages,
        publisher: src.publisher,
        isbn: chosenIsbn ?? undefined,
      };
      ingestPayload.push(bookLike);
    } catch (e: unknown) {
      failed++;
      results.push({
        id: src.id?.toString() || "<n/a>",
        title: src.title ?? "<n/a>",
        status: "failed",
        reason:
          typeof e === "object" && e && "message" in e
            ? String((e as { message?: unknown }).message)
            : String(e),
      });
    }
  }

  // Call shared ingest
  const ingest = await ingestBooks(ingestPayload, { mode: args.mode, dryRun: args.dryRun });
  created += ingest.created;
  updated += ingest.updated;
  failed += ingest.failed;
  // Map ingest results into our results list (keep our skipped/warnings accumulated)
  for (const r of ingest.results) {
    results.push({ id: r.id, title: r.title, status: (r.status === "deleted" ? "updated" : r.status) as any });
  }

  const finished = Date.now();
  const report: BatchReport = {
  input: "mocks/books.ts",
    processed: items.length,
    created,
    updated,
    skipped,
    failed,
    invalidIsbn,
    startedAt: new Date(started).toISOString(),
    finishedAt: new Date(finished).toISOString(),
    durationMs: finished - started,
    results,
  };

  // eslint-disable-next-line no-console
  console.log("[import-batch] done:", {
    processed: report.processed,
    created,
    updated,
    skipped,
    failed,
    invalidIsbn,
    durationMs: report.durationMs,
  });

  if (args.report) {
    const out = path.resolve(process.cwd(), args.report);
    await writeFile(out, JSON.stringify(report, null, 2), "utf8");
    // eslint-disable-next-line no-console
    console.log("[import-batch] report written:", out);
  }
}
async function loadPayload(): Promise<InputBook[]> {
  const mod = await import("../../mocks/books");
  const books = (mod.books ?? []) as InputBook[];
  return Array.isArray(books) ? books : [];
}

main().catch((e) => {
  // eslint-disable-next-line no-console
  console.error("[import-batch] fatal:", e);
  process.exit(1);
});
