import type Database from "better-sqlite3";
import postgres from "postgres";
import { deterministicCatalogId, hashCanonicalJson } from "./identity";
import type { PartialDate } from "./normalize";
import {
  parsePublicationObservationValue,
  type ResolutionCandidate,
  type ResolutionDecision,
  resolveField,
} from "./resolver";

export const WORK_FIRST_PUBLICATION_RESOLVER_VERSION =
  "work-first-publication-v1";
const FIELD_KEY = "work.first_publication_date";

type CandidateRow = {
  id: string;
  sourceKey: string;
  sourceApproval: "pending" | "approved" | "suspended" | "retired";
  metadataPolicy: string | Record<string, unknown>;
  valueJson: string | unknown;
  provenanceKind: ResolutionCandidate["provenanceKind"];
  observationState: ResolutionCandidate["state"];
  retrievedAt: number | string | Date;
  actorRef: string | null;
  reason: string | null;
  sourceRecordState: "active" | "withdrawn" | "deleted";
  sourceLinkState: "active" | "candidate" | "rejected";
};

type CurrentResolutionRow = {
  id: string;
  state: ResolutionDecision["state"];
  selectedObservationId: string | null;
  resolverVersion: string;
};

type WorkProjectionRow = {
  firstPublicationDate: string | null;
  firstPublicationPrecision: PartialDate["precision"] | null;
  firstPublicationSortDate: string | null;
};

export type WorkFirstPublicationResult = {
  changed: boolean;
  resolutionId: string;
  decision: ResolutionDecision;
  projection: WorkProjectionRow;
};

export type WorkFirstPublicationOptions = {
  workId: string;
  resolvedAt?: number;
  actorRef?: string;
  failAfter?: "resolution" | "head";
};

function epochMilliseconds(value: number | string | Date): number {
  if (value instanceof Date) return value.getTime();
  if (typeof value === "number") return value;
  const numeric = Number(value);
  return Number.isFinite(numeric) ? numeric : new Date(value).getTime();
}

function parseJson(value: string | unknown): unknown {
  return typeof value === "string" ? JSON.parse(value) : value;
}

function policyAllowsWorkFirstPublication(
  value: string | Record<string, unknown>,
): boolean {
  try {
    const policy = parseJson(value) as {
      display?: unknown;
      proposedEvidenceOnly?: unknown;
      fieldPermission?: { allowedFields?: unknown };
    };
    if (policy.display !== true || policy.proposedEvidenceOnly === true) {
      return false;
    }
    const allowedFields = policy.fieldPermission?.allowedFields;
    return (
      allowedFields === undefined ||
      (Array.isArray(allowedFields) && allowedFields.includes(FIELD_KEY))
    );
  } catch {
    return false;
  }
}

function candidateFromRow(row: CandidateRow): ResolutionCandidate {
  const sourceUsable =
    row.sourceApproval === "approved" &&
    row.sourceLinkState === "active" &&
    policyAllowsWorkFirstPublication(row.metadataPolicy);
  return {
    id: row.id,
    sourceKey: row.sourceKey,
    sourceApproved: sourceUsable,
    sourcePriority: 0,
    value: parseJson(row.valueJson),
    provenanceKind: row.provenanceKind,
    state:
      sourceUsable && row.sourceRecordState !== "active"
        ? "withdrawn"
        : row.observationState,
    retrievedAt: epochMilliseconds(row.retrievedAt),
    actorRef: row.actorRef ?? undefined,
    reason: row.reason ?? undefined,
  };
}

export function resolveWorkFirstPublicationRows(rows: CandidateRow[]): {
  decision: ResolutionDecision;
  projection: WorkProjectionRow;
} {
  const candidates = rows.map(candidateFromRow);
  const decision = resolveField(FIELD_KEY, candidates);
  const selected = candidates.find(
    (candidate) => candidate.id === decision.selectedObservationId,
  );
  const parsed = selected
    ? parsePublicationObservationValue(selected.value)
    : null;
  return {
    decision,
    projection: parsed
      ? {
          firstPublicationDate: parsed.value,
          firstPublicationPrecision: parsed.precision,
          firstPublicationSortDate: parsed.sortDate,
        }
      : {
          firstPublicationDate: null,
          firstPublicationPrecision: null,
          firstPublicationSortDate: null,
        },
  };
}

const CANDIDATE_SQL = `
  select
    o.id as "id",
    s.key as "sourceKey",
    s.approval_state as "sourceApproval",
    s.metadata_policy as "metadataPolicy",
    o.value_json as "valueJson",
    o.provenance_kind as "provenanceKind",
    o.state as "observationState",
    o.retrieved_at as "retrievedAt",
    o.actor_ref as "actorRef",
    o.reason as "reason",
    sr.state as "sourceRecordState",
    sl.state as "sourceLinkState"
  from field_observations o
  join source_records sr on sr.id = o.source_record_id
  join metadata_sources s on s.id = sr.source_id
  join source_record_links sl
    on sl.source_record_id = sr.id
   and sl.entity_type = o.entity_type
   and sl.entity_id = o.entity_id
  where o.entity_type = 'work'
    and o.entity_id = PLACEHOLDER
    and o.field_key = 'work.first_publication_date'
  order by s.key asc, o.retrieved_at desc, o.id asc
`;

function resolutionId(
  workId: string,
  previousResolutionId: string | null,
  decision: ResolutionDecision,
): string {
  return deterministicCatalogId(
    "field_resolution",
    WORK_FIRST_PUBLICATION_RESOLVER_VERSION,
    hashCanonicalJson({
      decision,
      fieldKey: FIELD_KEY,
      previousResolutionId,
      workId,
    }),
  );
}

function isEquivalentCurrent(
  current: CurrentResolutionRow | undefined,
  decision: ResolutionDecision,
): boolean {
  return Boolean(
    current &&
      current.state === decision.state &&
      current.selectedObservationId === decision.selectedObservationId &&
      current.resolverVersion === WORK_FIRST_PUBLICATION_RESOLVER_VERSION,
  );
}

export function resolveWorkFirstPublicationSqlite(
  raw: InstanceType<typeof Database>,
  options: WorkFirstPublicationOptions,
): WorkFirstPublicationResult {
  const resolvedAt = options.resolvedAt ?? Date.now();
  const apply = raw.transaction(() => {
    const work = raw
      .prepare("select id from works where id = ?")
      .get(options.workId);
    if (!work) throw new Error(`Work ${options.workId} does not exist`);
    const rows = raw
      .prepare(CANDIDATE_SQL.replace("PLACEHOLDER", "?"))
      .all(options.workId) as CandidateRow[];
    const { decision, projection } = resolveWorkFirstPublicationRows(rows);
    const current = raw
      .prepare(
        `select r.id as "id",
                r.state as "state",
                r.selected_observation_id as "selectedObservationId",
                r.resolver_version as "resolverVersion"
         from field_resolution_heads h
         join field_resolutions r on r.id = h.resolution_id
         where h.entity_type = 'work'
           and h.entity_id = ?
           and h.field_key = 'work.first_publication_date'`,
      )
      .get(options.workId) as CurrentResolutionRow | undefined;
    if (isEquivalentCurrent(current, decision)) {
      return {
        changed: false,
        resolutionId: current?.id ?? "",
        decision,
        projection,
      };
    }
    const nextResolutionId = resolutionId(
      options.workId,
      current?.id ?? null,
      decision,
    );
    raw
      .prepare(
        `insert into field_resolutions (
           id, entity_type, entity_id, field_key, selected_observation_id,
           state, reason, previous_resolution_id, actor_ref, resolver_version,
           resolved_at
         ) values (?, 'work', ?, 'work.first_publication_date', ?, ?, ?, ?, ?, ?, ?)`,
      )
      .run(
        nextResolutionId,
        options.workId,
        decision.selectedObservationId,
        decision.state,
        decision.reason,
        current?.id ?? null,
        options.actorRef ?? "system:work-first-publication-resolver",
        WORK_FIRST_PUBLICATION_RESOLVER_VERSION,
        resolvedAt,
      );
    if (options.failAfter === "resolution") {
      throw new Error("Forced work first-publication failure after resolution");
    }
    raw
      .prepare(
        `insert into field_resolution_heads (
           entity_type, entity_id, field_key, resolution_id
         ) values ('work', ?, 'work.first_publication_date', ?)
         on conflict(entity_type, entity_id, field_key)
         do update set resolution_id = excluded.resolution_id`,
      )
      .run(options.workId, nextResolutionId);
    if (options.failAfter === "head") {
      throw new Error("Forced work first-publication failure after head");
    }
    raw
      .prepare(
        `update works
         set first_publication_date = ?,
             first_publication_precision = ?,
             first_publication_sort_date = ?,
             updated_at = ?
         where id = ?`,
      )
      .run(
        projection.firstPublicationDate,
        projection.firstPublicationPrecision,
        projection.firstPublicationSortDate,
        resolvedAt,
        options.workId,
      );
    return {
      changed: true,
      resolutionId: nextResolutionId,
      decision,
      projection,
    };
  });
  return apply.immediate();
}

export async function resolveWorkFirstPublicationPostgres(
  url: string,
  options: WorkFirstPublicationOptions,
): Promise<WorkFirstPublicationResult> {
  const client = postgres(url, { max: 1 });
  const resolvedAt = options.resolvedAt ?? Date.now();
  try {
    return await client.begin(async (sql) => {
      const works = (await sql.unsafe(
        "select id from works where id = $1 for update",
        [options.workId],
      )) as unknown as Array<{ id: string }>;
      if (!works[0]) throw new Error(`Work ${options.workId} does not exist`);
      const rows = await sql.unsafe<CandidateRow[]>(
        CANDIDATE_SQL.replace("PLACEHOLDER", "$1"),
        [options.workId],
      );
      const { decision, projection } = resolveWorkFirstPublicationRows([
        ...rows,
      ]);
      const currentRows = (await sql.unsafe(
        `select r.id as "id",
                r.state as "state",
                r.selected_observation_id as "selectedObservationId",
                r.resolver_version as "resolverVersion"
         from field_resolution_heads h
         join field_resolutions r on r.id = h.resolution_id
         where h.entity_type = 'work'
           and h.entity_id = $1
           and h.field_key = 'work.first_publication_date'`,
        [options.workId],
      )) as unknown as CurrentResolutionRow[];
      const current = currentRows[0];
      if (isEquivalentCurrent(current, decision)) {
        return {
          changed: false,
          resolutionId: current.id,
          decision,
          projection,
        };
      }
      const nextResolutionId = resolutionId(
        options.workId,
        current?.id ?? null,
        decision,
      );
      await sql.unsafe(
        `insert into field_resolutions (
           id, entity_type, entity_id, field_key, selected_observation_id,
           state, reason, previous_resolution_id, actor_ref, resolver_version,
           resolved_at
         ) values (
           $1, 'work', $2, 'work.first_publication_date', $3, $4, $5, $6,
           $7, $8, $9
         )`,
        [
          nextResolutionId,
          options.workId,
          decision.selectedObservationId,
          decision.state,
          decision.reason,
          current?.id ?? null,
          options.actorRef ?? "system:work-first-publication-resolver",
          WORK_FIRST_PUBLICATION_RESOLVER_VERSION,
          resolvedAt,
        ],
      );
      if (options.failAfter === "resolution") {
        throw new Error(
          "Forced work first-publication failure after resolution",
        );
      }
      await sql.unsafe(
        `insert into field_resolution_heads (
           entity_type, entity_id, field_key, resolution_id
         ) values ('work', $1, 'work.first_publication_date', $2)
         on conflict(entity_type, entity_id, field_key)
         do update set resolution_id = excluded.resolution_id`,
        [options.workId, nextResolutionId],
      );
      if (options.failAfter === "head") {
        throw new Error("Forced work first-publication failure after head");
      }
      await sql.unsafe(
        `update works
         set first_publication_date = $1,
             first_publication_precision = $2,
             first_publication_sort_date = $3,
             updated_at = $4
         where id = $5`,
        [
          projection.firstPublicationDate,
          projection.firstPublicationPrecision,
          projection.firstPublicationSortDate,
          resolvedAt,
          options.workId,
        ],
      );
      return {
        changed: true,
        resolutionId: nextResolutionId,
        decision,
        projection,
      };
    });
  } finally {
    await client.end({ timeout: 5_000 });
  }
}
