import { mkdir, rm, writeFile } from "node:fs/promises";
import path from "node:path";
import { afterEach, describe, expect, it, vi } from "vitest";
import { GET } from "./route";

const { readR2Object } = vi.hoisted(() => ({
  readR2Object: vi.fn(),
}));

vi.mock("@/media/r2", async (importOriginal) => {
  const original = await importOriginal<typeof import("@/media/r2")>();
  return {
    ...original,
    readR2Object,
  };
});

const cacheRoot = path.join(process.cwd(), ".cache", "covers");

async function cleanupCache(): Promise<void> {
  await rm(cacheRoot, { force: true, recursive: true });
}

describe("private cover route", () => {
  afterEach(async () => {
    vi.unstubAllEnvs();
    readR2Object.mockReset();
    await cleanupCache();
  });

  it("serves a cached cover when the file exists locally", async () => {
    vi.stubEnv("MEDIA_CACHE_ENABLED", "1");
    await mkdir(cacheRoot, { recursive: true });
    await writeFile(path.join(cacheRoot, "book.webp"), "cached");

    const response = await GET(
      new Request("http://localhost/api/media/covers/book.webp"),
      {
        params: Promise.resolve({ coverPath: ["book.webp"] }),
      },
    );

    expect(response.status).toBe(200);
    expect(response.headers.get("content-type")).toBe("image/webp");
    expect(response.headers.get("cache-control")).toBe(
      "public, max-age=31536000, immutable",
    );
    expect(response.headers.get("vercel-cdn-cache-control")).toBe(
      "public, max-age=31536000, immutable",
    );
    expect(await response.text()).toBe("cached");
  });

  it("skips the local cache when cache mode is disabled", async () => {
    vi.stubEnv("MEDIA_BACKEND", "r2");
    await mkdir(cacheRoot, { recursive: true });
    await writeFile(path.join(cacheRoot, "book.webp"), "cached");
    readR2Object.mockResolvedValue({
      body: new TextEncoder().encode("from-r2"),
      contentType: "image/webp",
    });

    const response = await GET(
      new Request("http://localhost/api/media/covers/book.webp"),
      {
        params: Promise.resolve({ coverPath: ["book.webp"] }),
      },
    );

    expect(readR2Object).toHaveBeenCalledWith("covers/book.webp");
    expect(await response.text()).toBe("from-r2");
  });

  it("serves an R2 object when the local cache misses", async () => {
    vi.stubEnv("MEDIA_BACKEND", "r2");
    readR2Object.mockResolvedValue({
      body: new TextEncoder().encode("from-r2"),
      cacheControl: "public, max-age=86400",
      contentLength: 7,
      contentType: "image/webp",
      etag: '"cover-etag"',
      lastModified: new Date("2026-07-25T12:00:00Z"),
    });

    const response = await GET(
      new Request("http://localhost/api/media/covers/book.webp"),
      {
        params: Promise.resolve({ coverPath: ["book.webp"] }),
      },
    );

    expect(readR2Object).toHaveBeenCalledWith("covers/book.webp");
    expect(response.status).toBe(200);
    expect(response.headers.get("content-type")).toBe("image/webp");
    expect(response.headers.get("cache-control")).toBe("public, max-age=86400");
    expect(response.headers.get("etag")).toBe('"cover-etag"');
    expect(await response.text()).toBe("from-r2");
  });

  it("returns 404 when the R2 object does not exist", async () => {
    vi.stubEnv("MEDIA_BACKEND", "r2");
    readR2Object.mockResolvedValue(undefined);

    const response = await GET(
      new Request("http://localhost/api/media/covers/missing.webp"),
      {
        params: Promise.resolve({ coverPath: ["missing.webp"] }),
      },
    );

    expect(response.status).toBe(404);
  });

  it("rejects path traversal attempts", async () => {
    const response = await GET(
      new Request("http://localhost/api/media/covers/../secret.txt"),
      {
        params: Promise.resolve({ coverPath: ["..", "secret.txt"] }),
      },
    );

    expect(response.status).toBe(400);
  });
});
