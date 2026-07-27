import type { Config } from "drizzle-kit";

export default {
  schema: "./src/db/catalog/schema.ts",
  out: "./drizzle",
  dialect: "sqlite",
  dbCredentials: {
    url: ".data/dev.sqlite",
  },
} satisfies Config;
