/**
 * Sync DB to the first 50 mock books and set cover paths to slugified WebP/JPG/PNG (prefers WebP, then JPG, then PNG).
 * - Deletes any DB rows not in the mock set (ids 1..50).
 * - Updates cover to "/covers/<id>-<title-slug>.<ext>" for kept rows, choosing ext by precedence.
 *
 * Run with Node/tsx (Windows-friendly):
 *   bunx tsx ./scripts/db/sync-covers.ts
 */
import { ensureDb } from "../../src/db/client";
import { provider } from "../../src/db/provider";
import { books as mockBooks } from "../../mocks/books";
import { stat } from "node:fs/promises";
import path from "node:path";

function slugify(input: string): string {
  return input.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "");
}

async function main() {
  await ensureDb();
  const dbBooks = await provider.listBooks();

  // Build allowed id set from mocks (first 50 entries)
  const allowed = new Set(mockBooks.slice(0, 50).map((b) => b.id));
  const expectedCover = new Map<string, string>();
  for (const b of mockBooks.slice(0, 50)) {
    const base = `${b.id}-${slugify(b.title)}`;
    const candidates = [
      path.join(process.cwd(), "public", "covers", `${base}.webp`),
      path.join(process.cwd(), "public", "covers", `${base}.jpg`),
      path.join(process.cwd(), "public", "covers", `${base}.png`),
    ];
    let rel = `/covers/${base}.webp`;
    for (const full of candidates) {
      try {
        await stat(full);
        rel = `/covers/${path.basename(full)}`;
        break;
      } catch {
        // try next extension
      }
    }
    expectedCover.set(b.id, rel);
  }

  let deleted = 0;
  let updated = 0;

  for (const row of dbBooks) {
    if (!allowed.has(row.id)) {
  await provider.deleteBookRow(row.id);
      deleted++;
      continue;
    }
    const want = expectedCover.get(row.id)!;
    if (row.cover !== want) {
  await provider.updateBookRow(row.id, { cover: want });
      updated++;
    }
  }

  // Optional: sanity log for ids missing in DB (not creating them here)
  const present = new Set(dbBooks.map((b) => b.id));
  const missing = [...allowed].filter((id) => !present.has(id));
  if (missing.length) {
    console.warn("[sync] missing ids not created:", missing.join(", "));
  }

  console.log("[sync] done: updated=%d deleted=%d", updated, deleted);
}

main().catch((e) => {
  console.error("[sync] fatal", e);
  process.exit(1);
});
