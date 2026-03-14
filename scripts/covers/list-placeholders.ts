#!/usr/bin/env bun
import type { Book } from "@/features/books/types";
import baseCatalog from "@/../artifacts/catalog";

const books = baseCatalog as Book[];
const missing = books.filter((b) => b.cover.includes("placeholder.svg"));
console.log(`Total: ${books.length}`);
console.log(`Placeholders: ${missing.length}`);
for (const b of missing) {
  console.log(`${b.id}\t${b.title}`);
}
