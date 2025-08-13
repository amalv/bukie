import postgres from "postgres";

const url = process.env.DATABASE_URL ?? process.env.POSTGRES_URL;
if (!url) {
  // eslint-disable-next-line no-console
  console.error("DATABASE_URL/POSTGRES_URL is required for Postgres init");
  process.exit(1);
}

const sql = postgres(url, { max: 1 });

async function main() {
  try {
    // Minimal bootstrap to ensure the books table exists in preview/prod.
    await sql`
      CREATE TABLE IF NOT EXISTS books (
        id TEXT PRIMARY KEY,
        title TEXT NOT NULL,
        author TEXT NOT NULL,
        cover TEXT NOT NULL
      )
    `;
    // eslint-disable-next-line no-console
    console.log("[db:init:pg] ensured books table");
  } finally {
    await sql.end({ timeout: 5_000 });
  }
}

main().catch((err) => {
  // eslint-disable-next-line no-console
  console.error("Postgres init failed:", err);
  process.exit(1);
});
