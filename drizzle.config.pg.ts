import type { Config } from "drizzle-kit";

export default {
  schema: "./src/db/catalog/schema.pg.ts",
  out: "./drizzle/pg",
  dialect: "postgresql",
} satisfies Config;
