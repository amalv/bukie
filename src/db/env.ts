export type DbDriver = "sqlite" | "postgres";

export type DbEnv = {
  driver: DbDriver;
  sqlitePath: string;
  postgresUrl?: string;
};

export function getDbEnv(): DbEnv {
  const nodeEnv = process.env.NODE_ENV ?? "development";
  const vercelEnv = process.env.VERCEL_ENV; // development | preview | production
  const postgresUrl = process.env.DATABASE_URL ?? process.env.POSTGRES_URL;

  const driver: DbDriver =
    vercelEnv === "production" || vercelEnv === "preview"
      ? "postgres"
      : nodeEnv === "production" && postgresUrl
        ? "postgres"
        : "sqlite";

  const sqlitePath = ".data/dev.sqlite";

  return { driver, sqlitePath, postgresUrl };
}
