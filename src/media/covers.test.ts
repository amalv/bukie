import { describe, expect, it } from "vitest";
import {
  isRemoteAssetUrl,
  PLACEHOLDER_COVER,
  resolveBookCoverSrc,
  shouldUnoptimizeImage,
  toCachedCoverRoute,
} from "./covers";

describe("media cover helpers", () => {
  it("routes catalog covers through the fallback-aware endpoint", () => {
    expect(resolveBookCoverSrc("/covers/book.webp", {})).toBe(
      "/api/media/covers/book.webp",
    );
    expect(resolveBookCoverSrc("/img.jpg", {})).toBe("/img.jpg");
  });

  it("falls back to the placeholder for missing values", () => {
    expect(resolveBookCoverSrc(undefined, {})).toBe(PLACEHOLDER_COVER);
    expect(resolveBookCoverSrc("  ", {})).toBe(PLACEHOLDER_COVER);
  });

  it("passes remote asset URLs through unchanged", () => {
    expect(
      resolveBookCoverSrc("https://covers.example.com/covers/book.webp"),
    ).toBe("https://covers.example.com/covers/book.webp");
  });

  it("always maps r2 covers to the private media route", () => {
    expect(
      resolveBookCoverSrc("/covers/book.webp", {
        MEDIA_BACKEND: "r2",
        R2_PUBLIC_BASE_URL: "https://covers.example.com",
      }),
    ).toBe("/api/media/covers/book.webp");
  });

  it("uses the private media route when r2 has no public origin", () => {
    expect(
      resolveBookCoverSrc("/covers/book.webp", {
        MEDIA_BACKEND: "r2",
      }),
    ).toBe("/api/media/covers/book.webp");
  });

  it("keeps the placeholder local even when r2 is enabled", () => {
    expect(
      resolveBookCoverSrc(PLACEHOLDER_COVER, {
        MEDIA_BACKEND: "r2",
        R2_PUBLIC_BASE_URL: "https://covers.example.com",
      }),
    ).toBe(PLACEHOLDER_COVER);
  });

  it("builds helper URLs consistently", () => {
    expect(toCachedCoverRoute("/covers/path/to/book.webp")).toBe(
      "/api/media/covers/path/to/book.webp",
    );
    expect(isRemoteAssetUrl("https://covers.example.com/book.webp")).toBe(true);
    expect(isRemoteAssetUrl("/covers/book.webp")).toBe(false);
  });

  it("unoptimizes remote, svg, proxied, or non-production image sources", () => {
    expect(shouldUnoptimizeImage("/covers/book.webp", "test")).toBe(true);
    expect(shouldUnoptimizeImage("/covers/book.webp", "production")).toBe(
      false,
    );
    expect(
      shouldUnoptimizeImage(
        "https://covers.example.com/book.webp",
        "production",
      ),
    ).toBe(true);
    expect(shouldUnoptimizeImage("/covers/placeholder.svg", "production")).toBe(
      true,
    );
    expect(
      shouldUnoptimizeImage("/api/media/covers/book.webp", "production"),
    ).toBe(true);
  });
});
