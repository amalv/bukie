import {
  type CatalogQueryExecutor,
  createCatalogRepository,
} from "@/db/catalog/repository";
import { ensureDb, getSqliteRaw } from "@/db/client";
import { getDbEnv } from "@/db/env";
import { getPgSql } from "@/db/pg";
import type { PageResult } from "./pagination";
import type { WorkDetail, WorkSummary } from "./types";

function activeExecutor(): CatalogQueryExecutor {
  const env = getDbEnv();
  if (env.driver === "postgres") {
    const client = getPgSql();
    return {
      dialect: "postgres",
      async query<T extends Record<string, unknown>>(
        statement: string,
        parameters: unknown[] = [],
      ) {
        const rows = await client.unsafe(statement, parameters as never[]);
        return [...rows] as unknown as T[];
      },
    };
  }
  const raw = getSqliteRaw();
  return {
    dialect: "sqlite",
    async query<T extends Record<string, unknown>>(
      statement: string,
      parameters: unknown[] = [],
    ) {
      return raw.prepare(statement).all(...parameters) as T[];
    },
  };
}

async function repository() {
  await ensureDb();
  return createCatalogRepository(activeExecutor());
}

export async function getWorks(query?: string): Promise<WorkSummary[]> {
  return (await repository()).listWorkSummaries(query);
}

export async function getWorksPage(params: {
  q?: string;
  after?: string | null;
  limit: number;
}): Promise<PageResult<WorkSummary>> {
  return (await repository()).pageWorkSummaries({
    query: params.q,
    after: params.after,
    limit: params.limit,
  });
}

export async function findWorkById(
  id: string,
): Promise<WorkDetail | undefined> {
  return (await repository()).getWorkDetail(id);
}

export async function getNewArrivals(limit = 24): Promise<WorkSummary[]> {
  return (await repository()).listNewArrivals(limit);
}
