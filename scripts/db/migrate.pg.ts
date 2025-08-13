import { migrate } from "drizzle-orm/postgres-js/migrator";
import { drizzle as drizzlePostgres } from "drizzle-orm/postgres-js";
import postgres from "postgres";

const url = process.env.DATABASE_URL ?? process.env.POSTGRES_URL;
if (!url) {
  // eslint-disable-next-line no-console
  console.error("DATABASE_URL/POSTGRES_URL is required for Postgres migrations");
  process.exit(1);
}

// Use a single connection; drizzle migrator will create needed locks/transactions.
const sql = postgres(url, { max: 1 });
const db = drizzlePostgres(sql);

async function main() {
  try {
  await migrate(db, { migrationsFolder: "drizzle/pg" });
  } finally {
    await sql.end({ timeout: 5_000 });
  }
}

main().catch((err) => {
  // eslint-disable-next-line no-console
  console.error("Postgres migration failed:", err);
  process.exit(1);
});
