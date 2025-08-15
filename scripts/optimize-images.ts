/*
  Local image converter for public/ assets.
  - Converts PNG/JPG/JPEG to WebP and/or AVIF
  - Optional resize to max width
  - Skips SVGs

  Usage (via package.json script):
    bun ./scripts/optimize-images.ts --webp --maxWidth 450 --quality 80
*/
import fs from "node:fs/promises";
import path from "node:path";
import sharp from "sharp";

type Options = {
  root: string;
  webp: boolean;
  avif: boolean;
  force: boolean;
  maxWidth?: number;
  quality: number;
};

function parseArgs(): Options {
  const args = process.argv.slice(2);
  const getFlag = (name: string) => args.includes(`--${name}`);
  const getNum = (name: string): number | undefined => {
    const idx = args.findIndex((a) => a === `--${name}`);
    if (idx !== -1 && args[idx + 1]) {
      const n = Number(args[idx + 1]);
      return Number.isFinite(n) ? n : undefined;
    }
    return undefined;
  };
  const getStr = (name: string): string | undefined => {
    const idx = args.findIndex((a) => a === `--${name}`);
    return idx !== -1 ? args[idx + 1] : undefined;
  };

  return {
    root: getStr("path") ?? "public",
    webp: getFlag("webp") || !getFlag("avif"), // default to webp if neither specified
    avif: getFlag("avif"),
    force: getFlag("force"),
    maxWidth: getNum("maxWidth"),
    quality: getNum("quality") ?? 80,
  };
}

async function* walk(dir: string): AsyncGenerator<string> {
  const entries = await fs.readdir(dir, { withFileTypes: true });
  for (const e of entries) {
    const p = path.join(dir, e.name);
    if (e.isDirectory()) yield* walk(p);
    else yield p;
  }
}

function isRasterImage(file: string): boolean {
  const ext = path.extname(file).toLowerCase();
  return [".png", ".jpg", ".jpeg"].includes(ext);
}

async function ensureDir(p: string) {
  await fs.mkdir(path.dirname(p), { recursive: true });
}

async function fileSize(p: string): Promise<number> {
  try {
    const s = await fs.stat(p);
    return s.size;
  } catch {
    return 0;
  }
}

async function convertOne(input: string, outPath: string, format: "webp" | "avif", opts: Options) {
  const pipeline = sharp(input).rotate();
  if (opts.maxWidth) pipeline.resize({ width: opts.maxWidth, withoutEnlargement: true });
  if (format === "webp") pipeline.webp({ quality: opts.quality, effort: 4 });
  if (format === "avif") pipeline.avif({ quality: Math.round(Math.min(100, Math.max(30, opts.quality - 30))), effort: 4 });
  await ensureDir(outPath);
  await pipeline.toFile(outPath);
}

async function main() {
  const opts = parseArgs();
  const converted: Array<{ in: string; out: string; before: number; after: number; fmt: string }>
    = [];

  for await (const file of walk(opts.root)) {
    if (!isRasterImage(file)) continue;

    const base = file.slice(0, -path.extname(file).length);
    const targets: Array<"webp" | "avif"> = [];
    if (opts.webp) targets.push("webp");
    if (opts.avif) targets.push("avif");
    const before = await fileSize(file);

    for (const fmt of targets) {
      const out = `${base}.${fmt}`;
      if (!opts.force) {
        try {
          const [srcStat, outStat] = await Promise.all([fs.stat(file), fs.stat(out)]);
          if (outStat.mtimeMs >= srcStat.mtimeMs) {
            // up-to-date
            continue;
          }
        } catch {
          // proceed
        }
      }
      await convertOne(file, out, fmt, opts);
      const after = await fileSize(out);
      converted.push({ in: file, out, before, after, fmt });
    }
  }

  if (converted.length === 0) {
    console.log("No images converted. Use --force to override or add new images.");
    return;
  }

  let saved = 0;
  for (const c of converted) {
    const delta = Math.max(0, c.before - c.after);
    saved += delta;
    const pct = c.before ? Math.round((delta / c.before) * 100) : 0;
    console.log(
      `${path.relative(process.cwd(), c.in)} -> ${path.relative(process.cwd(), c.out)} (${c.fmt}) | ${Math.round(c.before/1024)}KB -> ${Math.round(c.after/1024)}KB (-${pct}%)`
    );
  }
  console.log(`Total saved ~ ${Math.round(saved / 1024)} KB`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
