import { existsSync, realpathSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";

export type RebuildTarget =
  | { driver: "sqlite"; path: string; description: string }
  | { driver: "postgres"; url: string; description: string };

type SafetyEnvironment = Record<string, string | undefined>;

function isWithin(parent: string, candidate: string): boolean {
  const relative = path.relative(parent, candidate);
  return (
    relative === "" ||
    (!relative.startsWith("..") && !path.isAbsolute(relative))
  );
}

function canonicalizePotentialPath(candidate: string): string {
  let existing = candidate;
  while (!existsSync(existing)) {
    const parent = path.dirname(existing);
    if (parent === existing) return candidate;
    existing = parent;
  }
  const canonicalExisting = realpathSync.native(existing);
  return path.resolve(canonicalExisting, path.relative(existing, candidate));
}

function assertNonProductionEnvironment(env: SafetyEnvironment) {
  const markers = [env.NODE_ENV, env.VERCEL_ENV, env.ENVIRONMENT, env.APP_ENV]
    .filter(Boolean)
    .map((value) => value?.toLowerCase());
  if (markers.some((value) => value === "production" || value === "prod")) {
    throw new Error(
      "Catalog rebuild refused: production environment markers are active",
    );
  }
}

function activeDatabaseUrls(env: SafetyEnvironment): Set<string> {
  return new Set(
    [
      env.DATABASE_URL,
      env.DATABASE_URL_UNPOOLED,
      env.POSTGRES_URL,
      env.POSTGRES_URL_NON_POOLING,
    ].filter((value): value is string => Boolean(value)),
  );
}

export function resolveRebuildTarget(input: {
  rawTarget?: string;
  confirmDisposable: boolean;
  cwd?: string;
  env?: SafetyEnvironment;
}): RebuildTarget {
  const env = input.env ?? process.env;
  const cwd = path.resolve(input.cwd ?? process.cwd());
  assertNonProductionEnvironment(env);
  if (!input.rawTarget) {
    throw new Error(
      "Catalog rebuild refused: pass an explicit --target=sqlite:<path> or --target=postgres:<url>",
    );
  }
  if (!input.confirmDisposable) {
    throw new Error(
      "Catalog rebuild refused: --confirm-disposable is required",
    );
  }

  if (input.rawTarget.startsWith("sqlite:")) {
    const rawPath = input.rawTarget.slice("sqlite:".length);
    if (!rawPath.trim()) {
      throw new Error("Catalog rebuild refused: SQLite target path is empty");
    }
    const resolvedPath = canonicalizePotentialPath(path.resolve(cwd, rawPath));
    const activePath = canonicalizePotentialPath(
      path.resolve(cwd, ".data", "dev.sqlite"),
    );
    if (resolvedPath === activePath) {
      throw new Error(
        "Catalog rebuild refused: the active local development database is not disposable",
      );
    }
    const allowedWorkspaceRoot = canonicalizePotentialPath(
      path.resolve(cwd, ".data", "catalog-targets"),
    );
    const allowedTempRoot = canonicalizePotentialPath(path.resolve(tmpdir()));
    if (
      !isWithin(allowedWorkspaceRoot, resolvedPath) &&
      !isWithin(allowedTempRoot, resolvedPath)
    ) {
      throw new Error(
        `Catalog rebuild refused: SQLite target must be inside ${allowedWorkspaceRoot} or the operating-system temp directory`,
      );
    }
    if (!/catalog|test|tmp/i.test(path.basename(resolvedPath))) {
      throw new Error(
        "Catalog rebuild refused: SQLite filename must identify a catalog/test disposable target",
      );
    }
    return {
      driver: "sqlite",
      path: resolvedPath,
      description: `sqlite:${resolvedPath}`,
    };
  }

  if (input.rawTarget.startsWith("postgres:")) {
    const rawUrl = input.rawTarget.slice("postgres:".length);
    let url: URL;
    try {
      url = new URL(rawUrl);
    } catch {
      throw new Error("Catalog rebuild refused: invalid Postgres target URL");
    }
    if (!["postgres:", "postgresql:"].includes(url.protocol)) {
      throw new Error(
        "Catalog rebuild refused: Postgres target must use postgres:// or postgresql://",
      );
    }
    if (activeDatabaseUrls(env).has(rawUrl)) {
      throw new Error(
        "Catalog rebuild refused: target matches an active application database URL",
      );
    }
    const database = decodeURIComponent(url.pathname.replace(/^\//, ""));
    const targetLabel = `${url.hostname}/${database}`.toLowerCase();
    if (/(^|[-_/])(prod|production|live|main)([-_/]|$)/.test(targetLabel)) {
      throw new Error(
        "Catalog rebuild refused: Postgres target is production-like",
      );
    }
    const isolated =
      url.hostname === "localhost" ||
      url.hostname === "127.0.0.1" ||
      /(test|preview|branch|local|dev|isolated|disposable)/.test(targetLabel);
    if (!database || !isolated) {
      throw new Error(
        "Catalog rebuild refused: Postgres target is not explicitly isolated",
      );
    }
    return {
      driver: "postgres",
      url: rawUrl,
      description: `postgres:${url.hostname}/${database}`,
    };
  }

  throw new Error(
    "Catalog rebuild refused: target must start with sqlite: or postgres:",
  );
}
