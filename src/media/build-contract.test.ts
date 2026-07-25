import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

type PackageJson = {
  scripts?: Record<string, string>;
};

const R2_WRITE_PATTERN =
  /covers:(?:fetch:r2|r2:backfill)|images:optimize:r2|wrangler\s+r2\s+object\s+put|--upload-r2/;

describe("media build contract", () => {
  it("keeps every build lifecycle script read-only with respect to R2", () => {
    const packageJson = JSON.parse(
      readFileSync(path.join(process.cwd(), "package.json"), "utf8"),
    ) as PackageJson;
    const scripts = packageJson.scripts ?? {};
    expect(scripts.prebuild).toBeUndefined();
    expect(scripts.build).toBe(
      "bun run db:migrate:pg && bun run db:seed:pg && next build",
    );
    expect(scripts["build:ci"]).toBe("next build");
    expect(scripts.postbuild).toBeUndefined();

    const buildLifecycle = ["prebuild", "build", "build:ci", "postbuild"]
      .map((name) => scripts[name])
      .filter((script): script is string => Boolean(script));

    expect(buildLifecycle).not.toHaveLength(0);
    for (const script of buildLifecycle) {
      expect(script).not.toMatch(R2_WRITE_PATTERN);
    }
  });
});
