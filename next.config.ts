import type { NextConfig } from "next";

function getR2RemotePattern():
  | {
      protocol: "http" | "https";
      hostname: string;
      port?: string;
      pathname?: string;
    }
  | undefined {
  const raw = process.env.R2_PUBLIC_BASE_URL?.trim();
  if (!raw) return undefined;

  try {
    const url = new URL(raw);
    return {
      protocol: url.protocol === "http:" ? "http" : "https",
      hostname: url.hostname,
      port: url.port || undefined,
      pathname:
        url.pathname && url.pathname !== "/"
          ? `${url.pathname.replace(/\/+$/, "")}/**`
          : "/**",
    };
  } catch {
    return undefined;
  }
}

const r2RemotePattern = getR2RemotePattern();

const nextConfig: NextConfig = {
  allowedDevOrigins: ["127.0.0.1"],
  images: {
    formats: ["image/webp"],
    remotePatterns: [
      {
        protocol: "https",
        hostname: "placehold.co",
      },
      ...(r2RemotePattern ? [r2RemotePattern] : []),
    ],
  },
};

export default nextConfig;
