import { mkdir, rm, writeFile } from "node:fs/promises";
import path from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import { normalizeBookCover } from "./provider";

const coversDir = path.join(process.cwd(), "public", "covers");
const tempFiles = new Set<string>();

async function writeCover(filename: string): Promise<void> {
  await mkdir(coversDir, { recursive: true });
  const full = path.join(coversDir, filename);
  await writeFile(full, "test");
  tempFiles.add(full);
}

afterEach(async () => {
  await Promise.all(
    [...tempFiles].map(async (full) => {
      await rm(full, { force: true });
      tempFiles.delete(full);
    }),
  );
});

describe("normalizeBookCover", () => {
  it("prefers the canonical id-based cover when it exists", async () => {
    const id = "11111111-1111-1111-1111-111111111111";
    await writeCover(`${id}.webp`);

    expect(
      normalizeBookCover(
        id,
        "/covers/non-fiction-example-author-example-title.webp",
      ),
    ).toBe(`/covers/${id}.webp`);
  });

  it("can resolve a stale row to the canonical catalog id cover", async () => {
    const canonicalId = "aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa";
    await writeCover(`${canonicalId}.webp`);

    expect(
      normalizeBookCover(
        "non-fiction-legacy-id",
        "/covers/non-fiction-legacy-id-legacy-title.webp",
        canonicalId,
      ),
    ).toBe(`/covers/${canonicalId}.webp`);
  });

  it("preserves an existing stored cover path when no canonical file exists", async () => {
    await writeCover("legacy-cover.webp");

    expect(
      normalizeBookCover(
        "22222222-2222-2222-2222-222222222222",
        "/covers/legacy-cover.webp",
      ),
    ).toBe("/covers/legacy-cover.webp");
  });

  it("falls back to the placeholder when neither canonical nor stored files exist", () => {
    expect(
      normalizeBookCover(
        "33333333-3333-3333-3333-333333333333",
        "/covers/missing-cover.webp",
      ),
    ).toBe("/covers/placeholder.svg");
  });
});
