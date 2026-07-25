import { readFile } from "node:fs/promises";
import path from "node:path";
import { NextResponse } from "next/server";
import { getMediaConfig } from "@/media/config";
import { PLACEHOLDER_COVER } from "@/media/covers";
import { R2ConfigurationError, readR2Object } from "@/media/r2";

export const runtime = "nodejs";

const IMMUTABLE_CACHE_CONTROL = "public, max-age=31536000, immutable";
const FALLBACK_CACHE_CONTROL = "public, max-age=60";
const FALLBACK_CDN_CACHE_CONTROL = "public, max-age=300";

const CONTENT_TYPES = new Map([
  [".avif", "image/avif"],
  [".jpg", "image/jpeg"],
  [".jpeg", "image/jpeg"],
  [".png", "image/png"],
  [".svg", "image/svg+xml"],
  [".webp", "image/webp"],
]);

function getContentType(filename: string): string {
  const ext = path.extname(filename).toLowerCase();
  return CONTENT_TYPES.get(ext) ?? "application/octet-stream";
}

function sanitizeCoverPath(segments: string[]): string | undefined {
  if (segments.length === 0) return undefined;
  if (
    segments.some(
      (segment) =>
        !segment ||
        segment === "." ||
        segment === ".." ||
        segment.includes("\\"),
    )
  ) {
    return undefined;
  }
  return segments.join("/");
}

function createCoverResponse(
  body: BodyInit | Uint8Array,
  filename: string,
  metadata: {
    cacheControl?: string;
    contentLength?: number;
    contentType?: string;
    etag?: string;
    lastModified?: Date;
  } = {},
): Response {
  const cacheControl = metadata.cacheControl ?? IMMUTABLE_CACHE_CONTROL;
  const headers = new Headers({
    "cache-control": cacheControl,
    "content-type": metadata.contentType ?? getContentType(filename),
    "vercel-cdn-cache-control": cacheControl,
  });
  if (metadata.contentLength !== undefined) {
    headers.set("content-length", String(metadata.contentLength));
  }
  if (metadata.etag) headers.set("etag", metadata.etag);
  if (metadata.lastModified) {
    headers.set("last-modified", metadata.lastModified.toUTCString());
  }

  const responseBody =
    body instanceof Uint8Array ? new Uint8Array(body).buffer : body;
  return new Response(responseBody, { status: 200, headers });
}

function createPlaceholderRedirect(
  request: Request,
  reason: "configuration" | "local" | "origin" | "r2-missing",
): NextResponse {
  const response = NextResponse.redirect(
    new URL(PLACEHOLDER_COVER, request.url),
    307,
  );
  response.headers.set("cache-control", FALLBACK_CACHE_CONTROL);
  response.headers.set("vercel-cdn-cache-control", FALLBACK_CDN_CACHE_CONTROL);
  response.headers.set("x-bukie-cover-fallback", reason);
  return response;
}

export async function GET(
  request: Request,
  context: { params: Promise<{ coverPath: string[] }> },
) {
  const { coverPath } = await context.params;
  const relativePath = sanitizeCoverPath(coverPath);
  if (!relativePath) {
    return NextResponse.json({ error: "Invalid cover path" }, { status: 400 });
  }

  const config = getMediaConfig();
  const cacheRoot = path.join(process.cwd(), ".cache", "covers");
  const cachePath = path.resolve(cacheRoot, relativePath);
  if (
    cachePath === cacheRoot ||
    !cachePath.startsWith(`${cacheRoot}${path.sep}`)
  ) {
    return NextResponse.json({ error: "Invalid cover path" }, { status: 400 });
  }

  if (config.cacheEnabled) {
    try {
      const body = await readFile(cachePath);
      return createCoverResponse(body, cachePath);
    } catch {
      // A local cache miss falls through to the private R2 origin.
    }
  }

  if (config.backend !== "r2") {
    return createPlaceholderRedirect(request, "local");
  }

  try {
    const object = await readR2Object(`covers/${relativePath}`);
    if (!object) {
      return createPlaceholderRedirect(request, "r2-missing");
    }

    return createCoverResponse(object.body, relativePath, object);
  } catch (error) {
    if (error instanceof R2ConfigurationError) {
      return createPlaceholderRedirect(request, "configuration");
    }

    console.error("Unable to read cover from R2", {
      coverPath: relativePath,
      error: error instanceof Error ? error.message : "Unknown R2 error",
    });
    return createPlaceholderRedirect(request, "origin");
  }
}
