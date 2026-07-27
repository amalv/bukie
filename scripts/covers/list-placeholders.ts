#!/usr/bin/env bun
import baseCatalog from "@/../artifacts/catalog";
import type { LegacyCatalogArtifactRecord } from "@/../artifacts/catalog/types";

const books = baseCatalog as LegacyCatalogArtifactRecord[];
const missing = books.filter((b) => b.cover.includes("placeholder.svg"));
console.log(`Total: ${books.length}`);
console.log(`Placeholders: ${missing.length}`);
for (const b of missing) {
  console.log(`${b.id}\t${b.title}`);
}
