#!/usr/bin/env bun
import type { Book } from "@/features/books/types";
import sciFi from "@/../artifacts/catalog/sci-fi";

const books = sciFi as Book[];
const missing = books.filter((b) => b.cover.includes("placeholder.webp"));
console.log(`Total: ${books.length}`);
console.log(`Placeholders: ${missing.length}`);
for (const b of missing) {
  console.log(`${b.id}\t${b.title}`);
}
