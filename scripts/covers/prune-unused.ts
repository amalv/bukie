#!/usr/bin/env bun
/*
  Prune unused cover assets.
  - Scans public/covers for files
  - Builds the set of referenced cover paths from the typed catalogs
  - Reports extras; with --commit, deletes them

  Flags:
    --commit        Actually delete files (default is dry-run)
    --print         Print the list of extra files
*/
import { readdir, stat, rm } from "node:fs/promises";
import { join } from "node:path";
import type { Book } from "@/features/books/types";

// Import typed catalogs (extendable for other genres later)
import sciFi from "@/../artifacts/catalog/sci-fi";

const argHas = (flag: string) => process.argv.includes(flag);
const COMMIT = argHas("--commit");
const PRINT = argHas("--print");

const COVERS_DIR = join(process.cwd(), "public", "covers");

async function listFiles(dir: string): Promise<string[]> {
  const entries = await readdir(dir);
  // filter files only
  const files: string[] = [];
  for (const name of entries) {
    const p = join(dir, name);
    const s = await stat(p);
    if (s.isFile()) files.push(name);
  }
  return files;
}

function referencedFromCatalog(books: Book[]): Set<string> {
  const set = new Set<string>();
  for (const b of books) {
    if (!b.cover) continue;
    if (!b.cover.startsWith("/covers/")) continue;
    const fname = b.cover.replace("/covers/", "");
    set.add(fname);
  }
  return set;
}

async function main() {
  const files = await listFiles(COVERS_DIR);
  const referenced = referencedFromCatalog(sciFi);
  const unused = files.filter((f) => !referenced.has(f));

  console.log(`covers total: ${files.length}`);
  console.log(`referenced:   ${referenced.size}`);
  console.log(`unused:       ${unused.length}`);

  if (PRINT) {
    for (const f of unused) console.log(f);
  }

  if (COMMIT) {
    for (const f of unused) {
      const p = join(COVERS_DIR, f);
      await rm(p);
    }
    console.log(`Deleted ${unused.length} files.`);
  } else {
    console.log("Dry-run: pass --commit to delete, --print to list.");
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
