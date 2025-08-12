import { migrate } from "drizzle-orm/better-sqlite3/migrator";
import { db } from "@/db/client";

async function main() {
  migrate(db, { migrationsFolder: "drizzle" });
}

main();
