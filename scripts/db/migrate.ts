import { migrate } from "drizzle-orm/better-sqlite3/migrator";
import { getSqliteDb } from "@/db/client";

async function main() {
  migrate(getSqliteDb(), { migrationsFolder: "drizzle" });
}

main();
