/**
 * Sync DB rows to the typed catalog and canonical id-based cover assets.
 * - Deletes DB rows that are no longer present in the typed catalog.
 * - Updates cover to "/covers/<id>.<ext>" for kept rows, choosing ext by precedence.
 *
 * Run with:
 *   bunx tsx ./scripts/db/sync-covers.ts
 */
import { ensureDb } from "../../src/db/client";
import { provider } from "../../src/db/provider";
import { books as mockBooks } from "../../mocks/books";
import { stat } from "node:fs/promises";
import path from "node:path";

async function main() {
  await ensureDb();
  const dbBooks = await provider.listBooks();

  // Build allowed id set from the combined typed catalog.
  const allowed = new Set(mockBooks.map((b) => b.id));
  const expectedCover = new Map<string, string>();
  for (const b of mockBooks) {
    const candidates = [
      path.join(process.cwd(), "public", "covers", `${b.id}.webp`),
      path.join(process.cwd(), "public", "covers", `${b.id}.jpg`),
      path.join(process.cwd(), "public", "covers", `${b.id}.png`),
    ];
    let rel = `/covers/${b.id}.webp`;
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
