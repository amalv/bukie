import { afterEach, describe, expect, it, vi } from "vitest";
import { getDbEnv } from "./env";

describe("database environment", () => {
  afterEach(() => vi.unstubAllEnvs());

  it("allows an explicit disposable SQLite target in production-mode tests", () => {
    vi.stubEnv("NODE_ENV", "production");
    vi.stubEnv("DATABASE_URL", "postgres://application.example/catalog");
    vi.stubEnv("BUKIE_DB_DRIVER", "sqlite");
    vi.stubEnv("BUKIE_SQLITE_PATH", ".data/catalog-targets/runtime.sqlite");

    expect(getDbEnv()).toEqual({
      driver: "sqlite",
      postgresUrl: "postgres://application.example/catalog",
      sqlitePath: ".data/catalog-targets/runtime.sqlite",
    });
  });
});
