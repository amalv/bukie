#!/usr/bin/env bun
/**
 * Suggest cover slug->filename mappings for catalog items still using placeholder covers.
 * Usage: bunx tsx ./scripts/covers/suggest-mappings.ts
 */
import { readdir } from "node:fs/promises";
import { join } from "node:path";
import type { Book } from "@/features/books/types";
import sciFi from "@/../artifacts/catalog/sci-fi";

const COVERS_DIR = join(process.cwd(), "public", "covers");

const slugify = (s: string): string =>
  s
    .toLowerCase()
    .replace(/[’']/g, "")
    .replace(/[()]/g, "")
    .replace(/&/g, "and")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");

async function main() {
  const files = await readdir(COVERS_DIR);
  const webpFiles = files.filter((f) => f.toLowerCase().endsWith(".webp"));

  const missing = (sciFi as Book[]).filter((b) =>
    !b.cover || b.cover.includes("placeholder.svg")
  );

  const lines: string[] = [];

  for (const b of missing) {
    const slug = slugify(b.title);
    // Match filenames that end with the title slug
    const candidates = webpFiles.filter(
      (f) =>
        f.toLowerCase() === `${slug}.webp` ||
        f.toLowerCase().endsWith(`-${slug}.webp`)
    );
    if (candidates.length > 0) {
      // Prefer shortest filename (less random prefixes), then alphabetical
      candidates.sort((a, b) => a.length - b.length || a.localeCompare(b));
      const pick = candidates[0];
      lines.push(`  "${slug}": "/covers/${pick}",`);
    }
  }

  if (lines.length === 0) {
    console.log("No suggestions found; mapping likely complete.");
    return;
  }
  console.log("// Add these to coversBySlug in artifacts/catalog/sci-fi.ts:\n{");
  console.log(lines.join("\n"));
  console.log("}");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
