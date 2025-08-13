export type DbDriver = "sqlite" | "postgres";

export type DbEnv = {
  driver: DbDriver;
  sqlitePath: string;
  postgresUrl?: string;
};

export function getDbEnv(): DbEnv {
  const nodeEnv = process.env.NODE_ENV ?? "development";
  const vercelEnv = process.env.VERCEL_ENV; // development | preview | production
  // Accept common variants from integrations and potential lowercase keys
  const postgresUrl =
    process.env.DATABASE_URL ||
    process.env.DATABASE_URL_UNPOOLED ||
    process.env.POSTGRES_URL ||
    process.env.POSTGRES_URL_NON_POOLING ||
    (process.env as Record<string, string | undefined>).database_url ||
    (process.env as Record<string, string | undefined>).database_url_unpooled ||
    (process.env as Record<string, string | undefined>).postgres_url ||
    (process.env as Record<string, string | undefined>)
      .postgres_url_non_pooling;

  const driver: DbDriver =
    vercelEnv === "production" || vercelEnv === "preview"
      ? "postgres"
      : nodeEnv === "production" && postgresUrl
        ? "postgres"
        : "sqlite";

  const sqlitePath = ".data/dev.sqlite";

  return { driver, sqlitePath, postgresUrl };
}
