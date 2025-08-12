import { existsSync, rmSync } from "node:fs";
import { join } from "node:path";

const DB_PATH = join(process.cwd(), ".data", "dev.sqlite");

if (existsSync(DB_PATH)) {
  rmSync(DB_PATH, { force: true });
  // eslint-disable-next-line no-console
  console.log(`[db:reset] removed ${DB_PATH}`);
} else {
  // eslint-disable-next-line no-console
  console.log(`[db:reset] no DB file at ${DB_PATH}`);
}
