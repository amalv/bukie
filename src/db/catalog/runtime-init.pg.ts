import { drizzle } from "drizzle-orm/postgres-js";
import { migrate } from "drizzle-orm/postgres-js/migrator";
import postgres from "postgres";
import baseCatalog from "@/../artifacts/catalog";
import {
  buildCatalogImportGraph,
  legacyBooksToImportRecords,
} from "./importer";
import { seedCatalogPostgresExistingSchema } from "./postgres-rebuild";

async function relationExists(
  client: ReturnType<typeof postgres>,
  name: string,
): Promise<boolean> {
  const rows = await client<
    Array<{ relation: string | null }>
  >`select to_regclass(${`public.${name}`})::text as relation`;
  return Boolean(rows[0]?.relation);
}

async function relationCount(
  client: ReturnType<typeof postgres>,
  name: string,
): Promise<number> {
  if (!(await relationExists(client, name))) return 0;
  const rows = await client.unsafe<Array<{ count: string }>>(
    `select count(*)::text as count from "${name}"`,
  );
  return Number(rows[0]?.count ?? 0);
}

export async function initializeCatalogPostgres(url: string): Promise<void> {
  const graph = buildCatalogImportGraph(
    legacyBooksToImportRecords(baseCatalog),
  );
  let client = postgres(url, { max: 1 });
  try {
    if (
      (await relationExists(client, "works")) &&
      (await relationCount(client, "works")) === 0 &&
      (await relationCount(client, "books")) > 0
    ) {
      await client.end({ timeout: 5_000 });
      await seedCatalogPostgresExistingSchema({ url, graph });
      client = postgres(url, { max: 1 });
    }

    await migrate(drizzle(client), { migrationsFolder: "drizzle/pg" });
  } finally {
    await client.end({ timeout: 5_000 });
  }

  await seedCatalogPostgresExistingSchema({ url, graph });

  const validationClient = postgres(url, { max: 1 });
  try {
    const workCount = await relationCount(validationClient, "works");
    const legacyEvidence = await validationClient<Array<{ count: string }>>`
      select count(*)::text as count
      from source_records sr
      join metadata_sources ms on ms.id = sr.source_id
      where ms.key = 'legacy_catalog'
    `;
    if (
      workCount !== graph.works.length ||
      Number(legacyEvidence[0]?.count ?? 0) !== baseCatalog.length
    ) {
      throw new Error(
        `Normalized catalog validation failed: works=${workCount}, legacy evidence=${legacyEvidence[0]?.count ?? 0}`,
      );
    }
  } finally {
    await validationClient.end({ timeout: 5_000 });
  }
}
