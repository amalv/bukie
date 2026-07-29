import { createHash } from "node:crypto";
import sharp from "sharp";
import { describe, expect, it } from "vitest";
import { inspectCoverBytes } from "./inspection";

const INSPECTED_AT = Date.UTC(2026, 6, 29, 10, 0, 0);

describe("cover byte inspection", () => {
  it("records usable technical metadata and stable square/sidebar/crop flags", async () => {
    const bytes = await sharp(
      Buffer.from(
        `<svg width="500" height="500" xmlns="http://www.w3.org/2000/svg">
           <rect width="500" height="500" fill="white"/>
           <rect x="100" width="300" height="500" fill="#24202d"/>
           <path d="M100 420 L250 80 L400 420 Z" fill="#d19035"/>
         </svg>`,
      ),
    )
      .webp({ quality: 80 })
      .toBuffer();

    const first = await inspectCoverBytes({ bytes, inspectedAt: INSPECTED_AT });
    const retry = await inspectCoverBytes({ bytes, inspectedAt: INSPECTED_AT });

    expect(first).toMatchObject({
      mediaType: "image/webp",
      byteSize: bytes.length,
      width: 500,
      height: 500,
      aspectRatio: 1,
      decodeResult: "decoded",
    });
    expect(first.checksum).toBe(
      createHash("sha256").update(bytes).digest("hex"),
    );
    expect(first.flags).toEqual(
      expect.arrayContaining([
        "square_canvas",
        "sidebars",
        "extreme_aspect_ratio",
        "extreme_crop",
        "upscaling_risk",
      ]),
    );
    expect(retry).toEqual(first);
  });

  it("records corruption without inventing dimensions", async () => {
    const bytes = Buffer.from("not an image");

    const result = await inspectCoverBytes({
      bytes,
      inspectedAt: INSPECTED_AT,
    });

    expect(result).toMatchObject({
      mediaType: null,
      byteSize: bytes.length,
      width: null,
      height: null,
      aspectRatio: null,
      decodeResult: "corrupt",
      flags: ["corrupt"],
      qualityScore: 0,
    });
  });

  it("adds deterministic manual identity and quality-risk signals", async () => {
    const bytes = await sharp({
      create: {
        width: 240,
        height: 320,
        channels: 3,
        background: "#777777",
      },
    })
      .png()
      .toBuffer();

    const result = await inspectCoverBytes({
      bytes,
      inspectedAt: INSPECTED_AT,
      signals: {
        adaptationConflict: true,
        blurRisk: true,
        localeConflict: true,
      },
    });

    expect(result.flags).toEqual(
      expect.arrayContaining([
        "tiny_dimensions",
        "blur_risk",
        "upscaling_risk",
        "locale_conflict",
        "adaptation_conflict",
      ]),
    );
    expect(result.qualityScore).toBeLessThan(50);
  });
});
