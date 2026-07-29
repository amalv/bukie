import { describe, expect, it } from "vitest";
import { resolveCatalogDryRunTarget } from "./catalog-dry-run-safety";

describe("catalog dry-run target safety", () => {
  it("requires an explicit disposable target and confirmation", () => {
    expect(() =>
      resolveCatalogDryRunTarget({
        confirmDisposable: true,
        cwd: process.cwd(),
        env: {},
      }),
    ).toThrow(/explicit --target/);
    expect(() =>
      resolveCatalogDryRunTarget({
        rawTarget: "sqlite:.data/catalog-targets/issue-135-test.sqlite",
        confirmDisposable: false,
        cwd: process.cwd(),
        env: {},
      }),
    ).toThrow(/confirm-disposable/);
  });

  it("rejects production, preview, active, current-development, and ambiguous targets", () => {
    expect(() =>
      resolveCatalogDryRunTarget({
        rawTarget: "sqlite:.data/catalog-targets/issue-135-test.sqlite",
        confirmDisposable: true,
        cwd: process.cwd(),
        env: { NODE_ENV: "production" },
      }),
    ).toThrow(/production/);
    expect(() =>
      resolveCatalogDryRunTarget({
        rawTarget: "sqlite:.data/catalog-targets/issue-135-test.sqlite",
        confirmDisposable: true,
        cwd: process.cwd(),
        env: { VERCEL_ENV: "preview" },
      }),
    ).toThrow(/preview/);
    expect(() =>
      resolveCatalogDryRunTarget({
        rawTarget:
          "postgres:postgres://runner:different@localhost:5432/bukie_issue_135_test",
        confirmDisposable: true,
        cwd: process.cwd(),
        env: {
          DATABASE_URL:
            "postgresql://user:pass@LOCALHOST/bukie_issue_135_test?sslmode=disable",
        },
      }),
    ).toThrow(/active application database/);
    expect(() =>
      resolveCatalogDryRunTarget({
        rawTarget:
          "postgres:postgresql://user:pass@localhost/bukie_preview_test",
        confirmDisposable: true,
        cwd: process.cwd(),
        env: {},
      }),
    ).toThrow(/preview/);
    expect(() =>
      resolveCatalogDryRunTarget({
        rawTarget: "postgres:postgresql://user:pass@localhost/postgres",
        confirmDisposable: true,
        cwd: process.cwd(),
        env: {},
      }),
    ).toThrow(/explicitly identify/);
  });

  it("accepts only clearly isolated SQLite and Postgres test targets", () => {
    expect(
      resolveCatalogDryRunTarget({
        rawTarget: "sqlite:.data/catalog-targets/issue-135-test.sqlite",
        confirmDisposable: true,
        cwd: process.cwd(),
        env: {},
      }).driver,
    ).toBe("sqlite");
    expect(
      resolveCatalogDryRunTarget({
        rawTarget:
          "postgres:postgresql://user:pass@localhost/bukie_issue_135_test",
        confirmDisposable: true,
        cwd: process.cwd(),
        env: {},
      }).driver,
    ).toBe("postgres");
  });
});
