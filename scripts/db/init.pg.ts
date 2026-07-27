import { initializeCatalogPostgres } from "@/db/catalog/runtime-init.pg";

const url =
  process.env.DATABASE_URL ??
  process.env.DATABASE_URL_UNPOOLED ??
  process.env.POSTGRES_URL ??
  process.env.POSTGRES_URL_NON_POOLING;

if (!url) {
  throw new Error(
    "DATABASE_URL (or *_UNPOOLED/POSTGRES_URL[_NON_POOLING]) is required",
  );
}

await initializeCatalogPostgres(url);
console.log("[db:init:pg] normalized catalog is ready");
