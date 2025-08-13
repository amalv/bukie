import { drizzle as drizzlePostgres } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import { getDbEnv } from "./env";

type PgInstance = {
  sql: ReturnType<typeof postgres>;
  db: ReturnType<typeof drizzlePostgres>;
};

let instance: PgInstance | undefined;

export function getPgDb() {
  if (instance) return instance.db;
  const env = getDbEnv();
  if (!env.postgresUrl) {
    throw new Error(
      "DATABASE_URL/POSTGRES_URL must be set for postgres driver",
    );
  }
  const max = Number(
    process.env.DB_POOL_MAX ?? (process.env.VERCEL ? "1" : "1"),
  );
  const sql = postgres(env.postgresUrl, { max });
  const db = drizzlePostgres(sql);
  instance = { sql, db };
  return db;
}

export async function closePg(): Promise<void> {
  if (!instance) return;
  await instance.sql.end({ timeout: 5_000 });
  instance = undefined;
}
