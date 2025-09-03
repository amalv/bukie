# Curated Catalog Batches

This folder hosts curated per-category lists used by the importer.

Format: JSON array of objects (100 per category ideally). Minimal fields accepted by importer:
- id (optional; UUID will be generated if missing)
- title (required)
- author | authors[] (one of)
- isbn | isbn10 | isbn13 (any)
- description (optional)
- cover (optional; can be placeholder and later synced by covers workflow)
- publishedDate | year (optional)
- pages, publisher, language (optional)
- categories: ["Category Name", ...] (recommended)

Example entry:
{
  "title": "Dune",
  "authors": ["Frank Herbert"],
  "isbn13": "9780441172719",
  "description": "Epic science fiction saga on Arrakis.",
  "categories": ["Science Fiction"]
}

How to import:
- Dry run:
  bunx tsx ./scripts/db/import-batch.ts -- --input=./artifacts/catalog/sci-fi.json --category="Science Fiction" --batch-size=100 --dry-run
- Write with report:
  bunx tsx ./scripts/db/import-batch.ts -- --input=./artifacts/catalog/sci-fi.json --category="Science Fiction" --batch-size=100 --report=./artifacts/report-sci-fi.json