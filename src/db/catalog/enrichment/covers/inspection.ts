import { createHash } from "node:crypto";
import sharp from "sharp";
import type {
  CoverFlagCode,
  CoverInspection,
  CoverInspectionSignals,
} from "./types";
import { COVER_INSPECTION_VERSION } from "./types";

const ALLOWED_MEDIA_TYPES = new Set([
  "image/avif",
  "image/jpeg",
  "image/png",
  "image/webp",
]);
const TARGET_ASPECT_RATIO = 2 / 3;

const mediaTypeForFormat = (format: string | undefined): string | null => {
  if (format === "jpg" || format === "jpeg") return "image/jpeg";
  if (format === "png") return "image/png";
  if (format === "webp") return "image/webp";
  if (format === "avif" || format === "heif") return "image/avif";
  return format ? `image/${format}` : null;
};

const meanRegion = (
  pixels: Buffer,
  width: number,
  height: number,
  startX: number,
  endX: number,
): number => {
  let total = 0;
  let count = 0;
  for (let y = 0; y < height; y += 1) {
    for (let x = startX; x < endX; x += 1) {
      total += pixels[y * width + x] ?? 0;
      count += 1;
    }
  }
  return count === 0 ? 0 : total / count;
};

const detectsLightSidebars = async (bytes: Buffer): Promise<boolean> => {
  const { data, info } = await sharp(bytes)
    .resize({ width: 120, height: 180, fit: "fill" })
    .removeAlpha()
    .greyscale()
    .raw()
    .toBuffer({ resolveWithObject: true });
  const edgeWidth = Math.max(1, Math.floor(info.width * 0.1));
  const centerStart = Math.floor(info.width * 0.3);
  const centerEnd = Math.ceil(info.width * 0.7);
  const left = meanRegion(data, info.width, info.height, 0, edgeWidth);
  const right = meanRegion(
    data,
    info.width,
    info.height,
    info.width - edgeWidth,
    info.width,
  );
  const center = meanRegion(
    data,
    info.width,
    info.height,
    centerStart,
    centerEnd,
  );
  return left >= 238 && right >= 238 && (left + right) / 2 - center >= 22;
};

const advisoryScore = (flags: readonly CoverFlagCode[]): number => {
  const penalties: Record<CoverFlagCode, number> = {
    corrupt: 100,
    tiny_dimensions: 30,
    square_canvas: 18,
    sidebars: 18,
    extreme_aspect_ratio: 20,
    extreme_crop: 16,
    blur_risk: 18,
    upscaling_risk: 10,
    duplicate: 4,
    locale_conflict: 30,
    adaptation_conflict: 40,
  };
  return Math.max(
    0,
    100 - flags.reduce((total, flag) => total + penalties[flag], 0),
  );
};

const sortedFlags = (flags: Iterable<CoverFlagCode>): CoverFlagCode[] =>
  [...new Set(flags)].sort();

export const inspectCoverBytes = async (input: {
  bytes: Uint8Array;
  inspectedAt: number;
  signals?: CoverInspectionSignals;
}): Promise<CoverInspection> => {
  const bytes = Buffer.from(input.bytes);
  const checksum = createHash("sha256").update(bytes).digest("hex");
  try {
    const image = sharp(bytes, { failOn: "error" });
    const [metadata, stats, sidebars] = await Promise.all([
      image.metadata(),
      image.clone().stats(),
      detectsLightSidebars(bytes),
    ]);
    const width = metadata.width ?? null;
    const height = metadata.height ?? null;
    const mediaType = mediaTypeForFormat(metadata.format);
    if (
      !width ||
      !height ||
      !mediaType ||
      !ALLOWED_MEDIA_TYPES.has(mediaType)
    ) {
      const flags = sortedFlags([
        ...(input.signals?.localeConflict ? ["locale_conflict" as const] : []),
        ...(input.signals?.adaptationConflict
          ? ["adaptation_conflict" as const]
          : []),
      ]);
      return {
        mediaType,
        byteSize: bytes.length,
        width: null,
        height: null,
        aspectRatio: null,
        checksum,
        decodeResult: "unsupported",
        flags,
        qualityScore: advisoryScore(flags),
        inspectionVersion: COVER_INSPECTION_VERSION,
        inspectedAt: input.inspectedAt,
      };
    }

    const aspectRatio = width / height;
    const cropLoss =
      1 -
      Math.min(
        TARGET_ASPECT_RATIO / aspectRatio,
        aspectRatio / TARGET_ASPECT_RATIO,
      );
    const flags = sortedFlags([
      ...(width < 300 || height < 450 ? ["tiny_dimensions" as const] : []),
      ...(aspectRatio >= 0.9 && aspectRatio <= 1.1
        ? ["square_canvas" as const]
        : []),
      ...(sidebars || input.signals?.sidebars ? ["sidebars" as const] : []),
      ...(aspectRatio < 0.45 || aspectRatio > 0.85
        ? ["extreme_aspect_ratio" as const]
        : []),
      ...(cropLoss > 0.2 || input.signals?.extremeCrop
        ? ["extreme_crop" as const]
        : []),
      ...(stats.sharpness < 1 || input.signals?.blurRisk
        ? ["blur_risk" as const]
        : []),
      ...(width < 450 || height < 675 ? ["upscaling_risk" as const] : []),
      ...(input.signals?.localeConflict ? ["locale_conflict" as const] : []),
      ...(input.signals?.adaptationConflict
        ? ["adaptation_conflict" as const]
        : []),
    ]);
    return {
      mediaType,
      byteSize: bytes.length,
      width,
      height,
      aspectRatio,
      checksum,
      decodeResult: "decoded",
      flags,
      qualityScore: advisoryScore(flags),
      inspectionVersion: COVER_INSPECTION_VERSION,
      inspectedAt: input.inspectedAt,
    };
  } catch {
    return {
      mediaType: null,
      byteSize: bytes.length,
      width: null,
      height: null,
      aspectRatio: null,
      checksum,
      decodeResult: "corrupt",
      flags: ["corrupt"],
      qualityScore: 0,
      inspectionVersion: COVER_INSPECTION_VERSION,
      inspectedAt: input.inspectedAt,
    };
  }
};

export const scoreCoverFlags = advisoryScore;
