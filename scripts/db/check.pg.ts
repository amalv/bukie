import postgres from "postgres";

function getUrl(): string {
  const url =
    process.env.DATABASE_URL ||
    process.env.DATABASE_URL_UNPOOLED ||
    process.env.POSTGRES_URL ||
    process.env.POSTGRES_URL_NON_POOLING;
  if (!url) throw new Error("Missing DATABASE_URL/POSTGRES_URL env var");
  return url;
}

async function main() {
  const sql = postgres(getUrl(), { max: 1 });
  try {
    const migrations = await sql`
      select * from drizzle.__drizzle_migrations order by created_at asc
    `;
    // eslint-disable-next-line no-console
    console.log("migrations:", migrations);

    const columns = await sql`
      select column_name, data_type from information_schema.columns
      where table_schema = 'public' and table_name = 'books'
      order by ordinal_position
    `;
    // eslint-disable-next-line no-console
    console.log(
      "books columns:",
      columns.map((c: any) => `${c.column_name}:${c.data_type}`),
    );

    const metrics = await sql`
      select column_name, data_type from information_schema.columns
      where table_schema = 'public' and table_name = 'book_metrics'
      order by ordinal_position
    `;
    // eslint-disable-next-line no-console
    console.log(
      "book_metrics columns:",
      metrics.map((c: any) => `${c.column_name}:${c.data_type}`),
    );
  } finally {
    await sql.end({ timeout: 5_000 });
  }
}

main().catch((err) => {
  // eslint-disable-next-line no-console
  console.error(err);
  process.exit(1);
});
