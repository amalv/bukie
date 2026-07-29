import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

describe("cover inspection migrations", () => {
  it("add only internal candidate, inspection, decision, and projection tables", () => {
    for (const migrationPath of [
      "drizzle/0008_aspiring_karma.sql",
      "drizzle/pg/0010_clammy_cerebro.sql",
    ]) {
      const migration = readFileSync(path.resolve(migrationPath), "utf8");
      expect(migration.match(/^CREATE TABLE/gm)).toHaveLength(6);
      expect(migration).toContain("cover_candidates");
      expect(migration).toContain("cover_inspections");
      expect(migration).toContain("cover_decisions");
      expect(migration).toContain("cover_projections");
      expect(migration).toContain("transformation_history_json");
      expect(migration).toContain("representation_type");
      expect(migration).not.toMatch(
        /update\s+(?:["`]?edition_covers|["`]?cover_assets|["`]?field_resolution_heads)/i,
      );
      expect(migration).not.toMatch(
        /insert\s+into\s+(?:["`]?edition_covers|["`]?field_resolution_heads)/i,
      );
    }
  });
});
