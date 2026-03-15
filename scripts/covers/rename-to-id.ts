import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { sciFiCatalog } from "@/../artifacts/catalog/sci-fi";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const ROOT = path.resolve(__dirname, "../../..");
const COVERS_DIR = path.join(ROOT, "public", "covers");

const args = new Set(process.argv.slice(2));
const COMMIT = args.has("--commit");

function slugify(s: string): string {
  return s
    .toLowerCase()
    .replace(/[’']/g, "")
    .replace(/[()]/g, "")
    .replace(/&/g, "and")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function listCoverFiles(dir: string): string[] {
  if (!fs.existsSync(dir)) return [];
  return fs
    .readdirSync(dir)
    .filter((f) => f.toLowerCase().endsWith(".webp"))
    .map((f) => path.join(dir, f));
}

function scoreMatch(filename: string, slug: string): number {
  const base = path.basename(filename).toLowerCase();
  const target = `${slug}.webp`;
  if (base === target) return 100;
  if (base.endsWith(`-${slug}.webp`)) return 80;
  if (base.startsWith(`${slug}-`)) return 70;
  if (base.includes(slug)) return 50;
  return 0;
}

function ensureDir(p: string) {
  const d = path.dirname(p);
  fs.mkdirSync(d, { recursive: true });
}

function main() {
  const files = listCoverFiles(COVERS_DIR);
  if (files.length === 0) {
    console.log(`No files found in ${COVERS_DIR}`);
    return;
  }

  let planned = 0;
  let skippedExisting = 0;
  let unmatched = 0;

  for (const book of sciFiCatalog) {
    const id = book.id.trim();
    const slug = slugify(book.title);
    const dest = path.join(COVERS_DIR, `${id}.webp`);

    if (fs.existsSync(dest)) {
      skippedExisting++;
      continue;
    }

    // pick best candidate by heuristic score
    let best: { file: string; score: number } | null = null;
    for (const f of files) {
      const s = scoreMatch(f, slug);
      if (s > 0 && (!best || s > best.score)) best = { file: f, score: s };
    }

    if (!best) {
      unmatched++;
      console.log(`- no match for [${id}] ${book.title}`);
      continue;
    }

    planned++;
    if (COMMIT) {
      ensureDir(dest);
      fs.copyFileSync(best.file, dest);
      console.log(`copied -> ${path.basename(best.file)}  =>  ${id}.webp`);
    } else {
      console.log(`would copy -> ${path.basename(best.file)}  =>  ${id}.webp`);
    }
  }

  console.log("\nSummary:");
  console.log(`  planned copies: ${planned}`);
  console.log(`  already existed: ${skippedExisting}`);
  console.log(`  unmatched: ${unmatched}`);
  if (!COMMIT) {
    console.log("\nDry run. Re-run with --commit to copy files.");
  }
}

main();
