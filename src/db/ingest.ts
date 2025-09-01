import type { Book } from "@/features/books/types";
import { type BookProvider, provider } from "./provider";

export type IngestMode = "replace" | "upsert";

export type IngestItem = Omit<Book, "id"> & { id?: string };

export type IngestResultItem = {
  id: string;
  title: string;
  status: "created" | "updated" | "deleted" | "dry-run" | "failed";
  reason?: string;
};

export type IngestReport = {
  processed: number;
  created: number;
  updated: number;
  deleted: number;
  failed: number;
  results: IngestResultItem[];
};

export async function ingestBooks(
  items: IngestItem[],
  opts: { mode: IngestMode; dryRun?: boolean; prov?: BookProvider },
): Promise<IngestReport> {
  const prov = opts.prov ?? provider;
  const dryRun = opts.dryRun === true;
  const mode = opts.mode;

  const results: IngestResultItem[] = [];
  let created = 0;
  let updated = 0;
  let deleted = 0;
  let failed = 0;

  if (mode === "replace") {
    // Delete all existing rows first
    try {
      const existing = await prov.listBooks();
      for (const row of existing) {
        if (dryRun) {
          results.push({ id: row.id, title: row.title, status: "dry-run" });
          continue;
        }
        const ok = await prov.deleteBookRow(row.id);
        if (ok) deleted++;
      }
    } catch {
      // Best-effort delete; count as failed and proceed to insert
      failed++;
    }
  }

  // Create/update
  for (const it of items) {
    const id = (it as { id?: string }).id ?? "";
    try {
      if (dryRun) {
        results.push({ id: id || "<gen>", title: it.title, status: "dry-run" });
        continue;
      }
      if (mode === "upsert" && id) {
        const exists = await prov.getBook(id);
        if (exists) {
          await prov.updateBookRow(id, it);
          updated++;
          results.push({ id, title: it.title, status: "updated" });
          continue;
        }
      }
      const createdRow = await prov.createBookRow({
        ...it,
        id: id || undefined,
      });
      created++;
      results.push({
        id: createdRow.id,
        title: createdRow.title,
        status: "created",
      });
    } catch (e: unknown) {
      failed++;
      const reason =
        typeof e === "object" && e && "message" in e
          ? String((e as { message?: unknown }).message)
          : String(e);
      results.push({
        id: id || "<n/a>",
        title: it.title,
        status: "failed",
        reason,
      });
    }
  }

  return {
    processed: items.length,
    created,
    updated,
    deleted,
    failed,
    results,
  };
}
