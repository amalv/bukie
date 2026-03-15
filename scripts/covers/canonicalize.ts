#!/usr/bin/env bun
/**
 * Canonicalize cover filenames to /public/covers/<id>.webp.
 *
 * - Reads books from artifacts/catalog/index.ts (default)
 * - Computes expected dst: covers/<id>.webp
 * - Prefers the catalog's current cover path when it already points to a local file
 * - Falls back to files that start with "<id>-" or loosely match the title slug
 * - Copies to dst if found (dry-run by default)
 *
 * Flags:
 * --commit        Actually copy files (otherwise dry-run)
 * --source=<dir>  Source covers dir (default: public/covers)
 * --catalog=<ts>  Catalog module path (default: artifacts/catalog/index.ts)
 */
import * as path from "node:path";
import * as fs from "node:fs";

const args = new Map<string, string | boolean>();
for (const a of process.argv.slice(2)) {
  const [k, v] = a.split("=");
  if (k === "--commit") args.set("commit", true);
  else if (k.startsWith("--source")) args.set("source", v ?? "");
  else if (k.startsWith("--catalog")) args.set("catalog", v ?? "");
}

const commit = Boolean(args.get("commit"));
const sourceDir = (args.get("source") as string) || path.resolve("public/covers");
const catalogPath = (args.get("catalog") as string) || path.resolve("artifacts/catalog/index.ts");

function slugify(s: string): string {
  return s
    .toLowerCase()
    .replace(/[’']/g, "")
    .replace(/[()]/g, "")
    .replace(/&/g, "and")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

async function loadCatalog(): Promise<Array<{ id: string; title: string; cover?: string }>> {
  const mod = await import(pathToFileURL(catalogPath).toString());
  const list = (mod.default ?? mod.baseCatalog ?? mod.sciFiCatalogWithIdCovers ?? mod.sciFiCatalog) as any[];
  return list.map((b) => ({
    id: String(b.id),
    title: String(b.title),
    cover: typeof b.cover === "string" ? b.cover : undefined,
  }));
}

function pathToFileURL(p: string) {
  const u = new URL("file://");
  u.pathname = path.resolve(p).replace(/\\/g, "/");
  return u;
}

function scanFiles(dir: string): string[] {
  return fs.readdirSync(dir).filter((f) => f.toLowerCase().endsWith(".webp"));
}

function findCandidate(files: string[], title: string): string | undefined {
  const s = slugify(title);
  // exact match parts or contains
  const exact = files.find((f) => f.toLowerCase().includes(`${s}.webp`));
  if (exact) return exact;
  // loose contain
  return files.find((f) => f.toLowerCase().includes(s));
}

function findExistingCatalogCover(
  files: string[],
  cover: string | undefined,
): string | undefined {
  if (!cover?.startsWith("/covers/")) return undefined;
  const filename = path.basename(cover);
  return files.find((file) => file === filename);
}

async function main() {
  if (!fs.existsSync(sourceDir)) {
    console.error(`Source dir not found: ${sourceDir}`);
    process.exit(1);
  }
  const files = scanFiles(sourceDir);
  const catalog = await loadCatalog();

  let planned = 0;
  let skipped = 0;
  for (const b of catalog) {
    const dst = `${b.id}.webp`;
    if (files.includes(dst)) {
      skipped++;
      continue;
    }
    const candidate =
      findExistingCatalogCover(files, b.cover) ??
      files.find((f) => f.startsWith(`${b.id}-`)) ??
      findCandidate(files, b.title);
    if (!candidate) continue;
    planned++;
    const srcPath = path.join(sourceDir, candidate);
    const dstPath = path.join(sourceDir, dst);
    if (commit) {
      fs.copyFileSync(srcPath, dstPath);
      console.log(`copied: ${candidate} -> ${dst}`);
    } else {
      console.log(`would copy: ${candidate} -> ${dst}`);
    }
  }

  console.log(`\nPlanned: ${planned}, Already existed: ${skipped}`);
  if (!commit) console.log("Dry-run. Add --commit to apply.");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
