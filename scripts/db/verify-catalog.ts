import { closeSqlite, ensureDb, getSqliteRaw } from "@/db/client";
import { getDbEnv } from "@/db/env";

type CountRow = { count: number };

function count(statement: string): number {
  return Number(
    (getSqliteRaw().prepare(statement).get() as CountRow | undefined)?.count ??
      0,
  );
}

async function main(): Promise<void> {
  const env = getDbEnv();
  if (env.driver !== "sqlite") {
    throw new Error("db:verify requires BUKIE_DB_DRIVER=sqlite");
  }

  await ensureDb();
  const result = {
    works: count("select count(*) as count from works"),
    editions: count("select count(*) as count from editions"),
    legacyWorkLinks: count(`
      select count(*) as count
      from source_record_links srl
      join source_records sr on sr.id = srl.source_record_id
      join metadata_sources ms on ms.id = sr.source_id
      where ms.key = 'legacy_catalog' and srl.entity_type = 'work'
    `),
    legacyEditionLinks: count(`
      select count(*) as count
      from source_record_links srl
      join source_records sr on sr.id = srl.source_record_id
      join metadata_sources ms on ms.id = sr.source_id
      where ms.key = 'legacy_catalog' and srl.entity_type = 'edition'
    `),
    brokenSourceLinks: count(`
      select count(*) as count
      from source_record_links srl
      join source_records sr on sr.id = srl.source_record_id
      join metadata_sources ms on ms.id = sr.source_id
      left join works w
        on srl.entity_type = 'work' and w.id = srl.entity_id
      left join editions e
        on srl.entity_type = 'edition' and e.id = srl.entity_id
      where ms.key = 'legacy_catalog'
        and (
          (srl.entity_type = 'work' and w.id is null)
          or (srl.entity_type = 'edition' and e.id is null)
        )
    `),
    legacyTables: count(`
      select count(*) as count
      from sqlite_master
      where type = 'table' and name in ('books', 'book_metrics')
    `),
  };

  if (
    result.works < 1 ||
    result.editions < 1 ||
    result.legacyWorkLinks < result.works ||
    result.legacyEditionLinks < result.editions ||
    result.brokenSourceLinks !== 0 ||
    result.legacyTables !== 0
  ) {
    throw new Error(
      `normalized catalog verification failed: ${JSON.stringify(result)}`,
    );
  }

  console.log(`[db:verify] ${JSON.stringify(result)}`);
}

main()
  .catch((error) => {
    console.error("[db:verify] failed", error);
    process.exitCode = 1;
  })
  .finally(closeSqlite);
