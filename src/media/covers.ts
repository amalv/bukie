import type { MediaEnvironment } from "./config";

export const PLACEHOLDER_COVER = "/covers/placeholder.svg";
export const COVER_ROUTE_PREFIX = "/covers/";
export const COVER_CACHE_ROUTE_PREFIX = "/api/media/covers";

function normalizeLocalCoverPath(
  cover: string | undefined,
): string | undefined {
  const trimmed = cover?.trim();
  if (!trimmed) return undefined;
  if (trimmed.startsWith("/")) return trimmed;
  if (trimmed.startsWith(COVER_ROUTE_PREFIX)) return trimmed;
  if (trimmed.startsWith("covers/")) return `/${trimmed}`;
  return undefined;
}

export function isRemoteAssetUrl(value: string | undefined): boolean {
  if (!value) return false;
  try {
    const url = new URL(value);
    return url.protocol === "http:" || url.protocol === "https:";
  } catch {
    return false;
  }
}

export function toCachedCoverRoute(coverPath: string): string {
  const relative = coverPath
    .replace(/^\/?covers\//, "")
    .split("/")
    .map(encodeURIComponent)
    .join("/");
  return `${COVER_CACHE_ROUTE_PREFIX}/${relative}`;
}

export function resolveBookCoverSrc(
  cover: string | undefined,
  _env: MediaEnvironment = process.env,
): string {
  if (cover && isRemoteAssetUrl(cover)) return cover;

  const normalized = normalizeLocalCoverPath(cover) ?? PLACEHOLDER_COVER;
  if (normalized === PLACEHOLDER_COVER) return PLACEHOLDER_COVER;
  if (!normalized.startsWith(COVER_ROUTE_PREFIX)) return normalized;

  return toCachedCoverRoute(normalized);
}

export function shouldUnoptimizeImage(
  src: string,
  nodeEnv = process.env.NODE_ENV,
): boolean {
  return (
    nodeEnv !== "production" ||
    isRemoteAssetUrl(src) ||
    src.includes(".svg") ||
    src.startsWith(`${COVER_CACHE_ROUTE_PREFIX}/`)
  );
}
