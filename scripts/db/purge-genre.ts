import { ensureDb } from "../../src/db/client";
import { provider } from "../../src/db/provider";

/**
 * Purge all books for a given genre.
 * Usage (PowerShell):
 *   bunx tsx ./scripts/db/purge-genre.ts -- --genre="Science Fiction"
 */
function parseArg(name: string): string | undefined {
  const idx = process.argv.findIndex((a) => a === `--${name}` || a.startsWith(`--${name}=`));
  if (idx === -1) return undefined;
  const cur = process.argv[idx];
  if (cur.includes("=")) return cur.split("=", 2)[1];
  const next = process.argv[idx + 1];
  if (!next || next.startsWith("--")) return ""; // empty provided
  return next;
}

async function main() {
  const genre = parseArg("genre") || parseArg("category");
  if (!genre) {
    console.error("[purge-genre] Missing --genre\nExample: --genre=\"Science Fiction\"");
    process.exit(1);
  }
  await ensureDb();
  const n = await provider.deleteBooksByGenre(genre);
  console.log("[purge-genre] purged", { genre, deleted: n });
}

main().catch((e) => {
  console.error("[purge-genre] fatal:", e);
  process.exit(1);
});
