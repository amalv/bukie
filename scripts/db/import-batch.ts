/**
 * Batch importer for typed mocks (mocks/books.ts).
 * - Validates and normalizes fields (ISBN-10/13, dates, author array/string)
 * - Ingests via shared ingest (replace|upsert)
 * - Flags invalid ISBNs but does not block the whole batch
 *
 * Usage (PowerShell):
 *   bunx tsx ./scripts/db/import-batch.ts -- --batch-size=100 --dry-run
 *   bunx tsx ./scripts/db/import-batch.ts -- --batch-size=100 --report=./artifacts/report-YYYY-MM-DD.json
 *   bunx tsx ./scripts/db/import-batch.ts -- --input=./artifacts/catalog/sci-fi.json --category="Science Fiction" --batch-size=100
 */
import { writeFile, readFile as fsReadFile } from "node:fs/promises";
import path from "node:path";
import { ensureDb } from "../../src/db/client";
import { provider } from "../../src/db/provider";
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
  input?: string; // optional JSON file with curated items
  category?: string; // optional category override (e.g., "Science Fiction")
  purgeGenre?: string; // optional: delete existing rows of this genre before ingest
  purge?: boolean; // optional: if true, purge the current category's genre
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
  const input = arg.input;
  const category = arg.category;
  const purgeGenre = arg["purge-genre"] ?? arg.purgeGenre;
  const purge = Object.keys(arg).includes("purge");
  return { batchSize, dryRun, report, mode, input, category, purgeGenre, purge };
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

function hashString(s: string): number {
  let h = 0;
  for (let i = 0; i < s.length; i++) {
    h = (h * 31 + s.charCodeAt(i)) >>> 0;
  }
  return h >>> 0;
}

// Single concise fallback description for cards when none is provided.
const FALLBACK_DESCRIPTION = "No description available.";

async function main() {
  const args = parseArgs(process.argv);
  await ensureDb();
  const started = Date.now();
  const payload = await loadPayload(args);
  const items = payload.slice(0, Math.max(1, args.batchSize));

  // Optional purge step by genre (explicit or derived from category when --purge)
  const purgeTarget = args.purgeGenre ?? (args.purge ? args.category : undefined);
  if (!args.dryRun && purgeTarget) {
    const deleted = await provider.deleteBooksByGenre(purgeTarget);
    // eslint-disable-next-line no-console
    console.log(`[import-batch] purged`, { genre: purgeTarget, deleted });
  }

  // Build lookup maps to match existing rows for safe upserts (prevents new ids)
  // - Prefer exact ISBN match when available
  // - Fallback to normalized title+author match
  const existing = await provider.listBooks();
  const norm = (s: string) => s.trim().toLowerCase();
  const stripIsbn = (s: string) => s.replace(/[-\s]/g, "");
  const byIsbn = new Map<string, string>();
  const byKey = new Map<string, string>();
  for (const b of existing) {
    if (b.isbn && typeof b.isbn === "string" && b.isbn.trim().length > 0) {
      byIsbn.set(stripIsbn(b.isbn), b.id);
    }
    const t = (b.title ?? "");
    const a = (b.author ?? "");
    if (t && a) byKey.set(`${norm(t)}|${norm(a)}`, b.id);
  }
  

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
      const title = (src.title ?? "").trim();
      if (!title) {
        skipped++;
        results.push({ id: src.id?.toString().trim() || "<gen>", title: src.title ?? "<missing>", status: "skipped", reason: "missing title" });
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

      // Try to match an existing row to update (stable ids); else we'll create
      let matchedId: string | undefined;
      if (chosenIsbn) {
        const k = stripIsbn(chosenIsbn);
        matchedId = byIsbn.get(k);
      }
      if (!matchedId) {
        const key = `${norm(title)}|${norm(authorJoined)}`;
        matchedId = byKey.get(key);
      }
  const { randomUUID: genId } = await import("node:crypto");
  const id = src.id?.toString().trim() || matchedId || genId();

      // Map to Book shape; cover may be placeholder and updated later by covers workflow
      const basis = `${title}|${authorJoined}`;
      const h = hashString(basis);
      const fallbackRating = Number((3.6 + ((h % 14) / 10)).toFixed(1)); // 3.6..4.9
      const fallbackRatingsCount = 200 + (h % 24000); // 200..24199
  const genreCandidate = (src as any).genre ?? args.category ?? (Array.isArray(src.categories) && src.categories.length > 0 ? src.categories[0] : undefined);
  const defaultDesc = FALLBACK_DESCRIPTION;
      // Only set cover when provided explicitly, or when creating a new row.
      // This preserves existing cover paths on updates.
      const coverCandidate = src.cover?.toString().trim();
      const willUpdateExisting = Boolean(matchedId);
      const base: Record<string, unknown> = {
        id,
        title,
        author: authorJoined,
        // prefer explicit genre, then CLI category, then first categories[] entry
        genre: genreCandidate,
        rating: src.rating ?? fallbackRating,
        ratingsCount: src.ratingsCount ?? fallbackRatingsCount,
        addedAt: src.addedAt,
        year:
          typeof src.year === "number"
            ? src.year
            : parseInt(String(src.publishedDate ?? src.year ?? "").slice(0, 4)) || undefined,
        description: src.description ?? defaultDesc,
        pages: src.pages,
        publisher: src.publisher,
        isbn: chosenIsbn ?? undefined,
      };
      if (coverCandidate) {
        base.cover = coverCandidate;
      } else if (!willUpdateExisting) {
        base.cover = "/covers/placeholder.webp";
      }
      const bookLike = base as Omit<Book, "id"> & { id?: string };
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
  input: args.input ? path.resolve(process.cwd(), args.input) : "mocks/books.ts",
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

  // Always write a report (KISS): if no --report provided, derive a sensible default
  const defaultReportName = (() => {
    const baseFromInput = args.input
      ? path.basename(args.input).replace(/\.json$/i, "")
      : "import";
    const base = args.category
      ? args.category.toLowerCase().replace(/\s+/g, "-")
      : baseFromInput;
    return `report-${base}.json`;
  })();
  const reportPath = args.report || path.join("artifacts", defaultReportName);

  try {
    const out = path.resolve(process.cwd(), reportPath);
    await writeFile(out, JSON.stringify(report, null, 2), "utf8");
    // eslint-disable-next-line no-console
    console.log("[import-batch] report written:", out);
  } catch (e) {
    // eslint-disable-next-line no-console
    console.warn("[import-batch] failed to write report:", e);
  }
}
async function loadPayload(args: Args): Promise<InputBook[]> {
  if (args.input) {
    const full = path.resolve(process.cwd(), args.input);
    const raw = await fsReadFile(full, "utf8");
    const data = JSON.parse(raw);
    const arr = Array.isArray(data) ? data : Array.isArray((data as any).items) ? (data as any).items : [];
    return arr as InputBook[];
  }
  const mod = await import("../../mocks/books");
  const books = (mod.books ?? []) as InputBook[];
  return Array.isArray(books) ? books : [];
}

main().catch((e) => {
  // eslint-disable-next-line no-console
  console.error("[import-batch] fatal:", e);
  process.exit(1);
});
