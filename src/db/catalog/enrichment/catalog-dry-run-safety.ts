import path from "node:path";
import { type RebuildTarget, resolveRebuildTarget } from "../rebuild-safety";

type SafetyEnvironment = Record<string, string | undefined>;

export const resolveCatalogDryRunTarget = (input: {
  rawTarget?: string;
  confirmDisposable: boolean;
  cwd?: string;
  env?: SafetyEnvironment;
}): RebuildTarget => {
  const env = input.env ?? process.env;
  const deploymentMarkers = [env.VERCEL_ENV, env.ENVIRONMENT, env.APP_ENV]
    .filter(Boolean)
    .map((value) => value?.toLowerCase());
  if (
    deploymentMarkers.some(
      (value) => value === "preview" || value === "development-current",
    )
  ) {
    throw new Error(
      "Catalog dry run refused: preview or development-current environment markers are active",
    );
  }
  const target = resolveRebuildTarget(input);
  if (target.driver === "sqlite") {
    const label = path.basename(target.path).toLowerCase();
    if (/(^|[-_.])(preview|current|development)([-_.]|$)/.test(label)) {
      throw new Error(
        "Catalog dry run refused: SQLite target is preview or development-current",
      );
    }
    if (!/(dry[-_]?run|issue[-_]?135|test|isolated|disposable)/.test(label)) {
      throw new Error(
        "Catalog dry run refused: SQLite target does not explicitly identify an isolated dry-run/test target",
      );
    }
    return target;
  }
  const url = new URL(target.url);
  const database = decodeURIComponent(url.pathname.replace(/^\//, ""));
  const label = `${url.hostname}/${database}`.toLowerCase();
  if (/(^|[-_/])(preview|branch|current|development)([-_/]|$)/.test(label)) {
    throw new Error(
      "Catalog dry run refused: Postgres target is preview or development-current",
    );
  }
  if (!/(dry[-_]?run|issue[-_]?135|test|isolated|disposable)/.test(database)) {
    throw new Error(
      "Catalog dry run refused: Postgres database name does not explicitly identify an isolated dry-run/test target",
    );
  }
  return target;
};
