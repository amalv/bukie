import { ensureDb } from "@/db/client";

async function main(): Promise<void> {
  await ensureDb();
  console.log("[db:init] normalized SQLite catalog is ready");
}

main().catch((error) => {
  console.error("[db:init] failed", error);
  process.exitCode = 1;
});
