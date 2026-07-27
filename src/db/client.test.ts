import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { afterEach, describe, expect, it, vi } from "vitest";

describe("normalized SQLite runtime initialization", () => {
  const directories: string[] = [];

  afterEach(() => {
    vi.unstubAllEnvs();
    vi.resetModules();
    for (const directory of directories.splice(0)) {
      rmSync(directory, { recursive: true, force: true });
    }
  });

  it("starts clean with normalized data and no legacy runtime tables", async () => {
    const directory = mkdtempSync(path.join(tmpdir(), "bukie-runtime-"));
    directories.push(directory);
    vi.stubEnv("BUKIE_SQLITE_PATH", path.join(directory, "runtime.sqlite"));
    const client = await import("./client");
    await client.ensureDb();
    const raw = client.getSqliteRaw();
    expect(raw.prepare("select count(*) as count from works").get()).toEqual({
      count: 500,
    });
    expect(
      raw
        .prepare(
          `select name from sqlite_master
           where type = 'table' and name in ('books', 'book_metrics')`,
        )
        .all(),
    ).toEqual([]);
    client.closeSqlite();
  }, 30_000);
});
