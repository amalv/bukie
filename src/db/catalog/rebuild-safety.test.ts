import { tmpdir } from "node:os";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { resolveRebuildTarget } from "./rebuild-safety";

describe("catalog rebuild target safety", () => {
  const cwd = path.resolve("C:/workspace/bukie");
  const safeSqlite = `sqlite:${path.join(tmpdir(), "catalog-test.sqlite")}`;

  it("requires an explicit target and disposable confirmation", () => {
    expect(() =>
      resolveRebuildTarget({
        confirmDisposable: true,
        cwd,
        env: { NODE_ENV: "test" },
      }),
    ).toThrow("pass an explicit --target");
    expect(() =>
      resolveRebuildTarget({
        rawTarget: safeSqlite,
        confirmDisposable: false,
        cwd,
        env: { NODE_ENV: "test" },
      }),
    ).toThrow("--confirm-disposable is required");
  });

  it("refuses every target under production environment markers", () => {
    for (const env of [
      { NODE_ENV: "production" },
      { VERCEL_ENV: "production" },
      { APP_ENV: "prod" },
    ]) {
      expect(() =>
        resolveRebuildTarget({
          rawTarget: safeSqlite,
          confirmDisposable: true,
          cwd,
          env,
        }),
      ).toThrow("production environment markers");
    }
  });

  it("refuses the active SQLite database and paths outside disposable roots", () => {
    expect(() =>
      resolveRebuildTarget({
        rawTarget: "sqlite:.data/dev.sqlite",
        confirmDisposable: true,
        cwd,
        env: { NODE_ENV: "development" },
      }),
    ).toThrow("active local development database");
    expect(() =>
      resolveRebuildTarget({
        rawTarget: "sqlite:catalog.sqlite",
        confirmDisposable: true,
        cwd,
        env: { NODE_ENV: "test" },
      }),
    ).toThrow("must be inside");
  });

  it("accepts only resolved disposable SQLite paths", () => {
    const target = resolveRebuildTarget({
      rawTarget: safeSqlite,
      confirmDisposable: true,
      cwd,
      env: { NODE_ENV: "test" },
    });
    expect(target).toEqual({
      driver: "sqlite",
      path: path.join(tmpdir(), "catalog-test.sqlite"),
      description: `sqlite:${path.join(tmpdir(), "catalog-test.sqlite")}`,
    });
  });

  it("refuses active, production-like, and ambiguous Postgres URLs", () => {
    const active = "postgresql://user:secret@preview-db.example/test_catalog";
    expect(() =>
      resolveRebuildTarget({
        rawTarget: `postgres:${active}`,
        confirmDisposable: true,
        cwd,
        env: { NODE_ENV: "test", DATABASE_URL: active },
      }),
    ).toThrow("matches an active application database");
    expect(() =>
      resolveRebuildTarget({
        rawTarget:
          "postgres:postgresql://user:secret@db.example/production_catalog",
        confirmDisposable: true,
        cwd,
        env: { NODE_ENV: "test" },
      }),
    ).toThrow("production-like");
    expect(() =>
      resolveRebuildTarget({
        rawTarget: "postgres:postgresql://user:secret@db.example/catalog",
        confirmDisposable: true,
        cwd,
        env: { NODE_ENV: "test" },
      }),
    ).toThrow("not explicitly isolated");
  });

  it("refuses equivalent active Postgres URLs with different URL spelling", () => {
    const active =
      "postgresql://app:secret@LOCALHOST/issue_135_test?sslmode=disable";
    for (const target of [
      "postgres://runner:different@localhost:5432/issue_135_test",
      "postgresql://runner:different@127.0.0.1/issue_135_test?sslmode=require",
    ]) {
      expect(() =>
        resolveRebuildTarget({
          rawTarget: `postgres:${target}`,
          confirmDisposable: true,
          cwd,
          env: { NODE_ENV: "test", DATABASE_URL: active },
        }),
      ).toThrow("matches an active application database");
    }
  });

  it("accepts an explicitly isolated Postgres target without exposing credentials", () => {
    const target = resolveRebuildTarget({
      rawTarget:
        "postgres:postgresql://user:secret@catalog-preview.example/issue_122_test",
      confirmDisposable: true,
      cwd,
      env: { NODE_ENV: "test" },
    });
    expect(target.driver).toBe("postgres");
    expect(target.description).toBe(
      "postgres:catalog-preview.example/issue_122_test",
    );
    expect(target.description).not.toContain("secret");
  });
});
