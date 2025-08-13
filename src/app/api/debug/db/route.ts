import { NextResponse } from "next/server";
import { getDbEnv } from "@/db/env";

function describePgUrl(url: string | undefined) {
  if (!url) return undefined;
  try {
    const u = new URL(url);
    const pooled = u.hostname.includes("-pooler");
    return {
      host: u.hostname,
      database: u.pathname.replace(/^\//, ""),
      pooled,
    };
  } catch {
    return { invalid: true } as const;
  }
}

export async function GET() {
  const env = getDbEnv();
  const nodeEnv = process.env.NODE_ENV ?? "development";
  const vercelEnv = process.env.VERCEL_ENV ?? "-";
  const info = {
    driver: env.driver,
    nodeEnv,
    vercelEnv,
    target:
      env.driver === "postgres"
        ? describePgUrl(env.postgresUrl)
        : { path: ".data/dev.sqlite" },
  };
  return NextResponse.json(info);
}
