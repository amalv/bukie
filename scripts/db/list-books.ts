import Database from "better-sqlite3";
import { join } from "node:path";

const DB_PATH = join(process.cwd(), ".data", "dev.sqlite");

function main() {
  const db = new Database(DB_PATH, { readonly: true });
  try {
    const rows = db
      .prepare(
        `SELECT id, title, author, year, ratings_count AS ratingsCount FROM books ORDER BY added_at DESC LIMIT 200;`,
      )
      .all();

    if (!rows || rows.length === 0) {
      console.log("No books found in the local dev DB (", DB_PATH, ")");
      return;
    }

    // Print a compact table
    console.table(
      rows.map((r: any) => ({
        id: r.id,
        title: r.title,
        author: r.author,
        year: r.year ?? "-",
        ratings: r.ratingsCount ?? "-",
      })),
    );
  } finally {
    db.close();
  }
}

main();
