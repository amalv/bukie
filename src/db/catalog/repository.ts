import {
  type CatalogCategory,
  type CatalogQuery,
  catalogQueryKey,
  publicationPeriodBounds,
} from "@/features/books/catalogQuery";
import {
  decodeCursor,
  encodeCursor,
  type PageResult,
} from "@/features/books/pagination";
import type {
  DetailProvenance,
  EditionCover,
  EditionIdentifier,
  EditionLanguage,
  EditionPublisher,
  EditionSummary,
  WorkAuthor,
  WorkCategory,
  WorkDetail,
  WorkSummary,
} from "@/features/books/types";

export type CatalogQueryExecutor = {
  dialect: "sqlite" | "postgres";
  query<T extends Record<string, unknown>>(
    statement: string,
    parameters?: unknown[],
  ): Promise<T[]>;
};

type WorkRow = {
  id: string;
  title: string;
  sortTitle: string;
  description: string | null;
  preferredEditionId: string | null;
  publicationSortDate: string | null;
  catalogedAt: number | string | Date | null;
};

type EditionRow = {
  id: string;
  workId: string;
  title: string | null;
  subtitle: string | null;
  format: EditionSummary["format"] | null;
  publicationDate: string | null;
  publicationPrecision:
    | NonNullable<EditionSummary["publication"]>["precision"]
    | null;
  pages: number | null;
  catalogedAt: number;
};

type AuthorRow = {
  workId: string;
  id: string;
  name: string;
  role: WorkAuthor["role"];
  position: number;
};

type CategoryRow = {
  workId: string;
  id: string;
  slug: string;
  label: string;
  position: number;
  isPrimary: boolean | number;
};

type PublisherRow = {
  editionId: string;
  id: string;
  name: string;
  role: EditionPublisher["role"] | null;
  position: number;
};

type LanguageRow = {
  editionId: string;
  tag: string;
  label: string;
  position: number;
};

type IdentifierRow = {
  editionId: string;
  id: string;
  scheme: EditionIdentifier["scheme"];
  value: string;
  displayValue: string | null;
  isPrimary: boolean | number;
};

type CoverRow = {
  editionId: string;
  id: string;
  objectKey: string;
  mediaType: string | null;
  width: number | null;
  height: number | null;
};

type ProvenanceRow = {
  entityType: DetailProvenance["entityType"];
  entityId: string;
  field: DetailProvenance["field"];
  state: DetailProvenance["state"];
  reason: string;
  resolvedAt: number | string | Date;
  sourceKey: string | null;
  sourceName: string | null;
  sourceApproval:
    | NonNullable<DetailProvenance["evidence"]>["sourceApproval"]
    | null;
  provenanceKind: NonNullable<DetailProvenance["evidence"]>["kind"] | null;
  observationState: "active" | "stale" | "withdrawn" | "invalid" | null;
  retrievedAt: number | string | Date | null;
  sourceRecordState: "active" | "withdrawn" | "deleted" | null;
  sourceLinkState: "active" | "candidate" | "rejected" | null;
  metadataPolicy: string | Record<string, unknown> | null;
  assetPolicy: string | Record<string, unknown> | null;
};

type ProjectedWork = WorkSummary | Omit<WorkDetail, "provenance">;

export type CatalogRepository = {
  listWorkSummaries(query?: CatalogQuery): Promise<WorkSummary[]>;
  pageWorkSummaries(params: {
    query: CatalogQuery;
    after?: string | null;
    limit: number;
  }): Promise<PageResult<WorkSummary>>;
  listCategories(): Promise<CatalogCategory[]>;
  listNewArrivals(limit?: number): Promise<WorkSummary[]>;
  getWorkDetail(id: string): Promise<WorkDetail | undefined>;
};

const WORK_COLUMNS = `
  select
    w.id as "id",
    w.preferred_title as "title",
    w.sort_title as "sortTitle",
    w.description as "description",
    w.preferred_edition_id as "preferredEditionId",
    preferred.publication_sort_date as "publicationSortDate",
    preferred.cataloged_at as "catalogedAt"
  from works w
  left join editions preferred on preferred.id = w.preferred_edition_id
`;

function optional<T>(value: T | null): T | undefined {
  return value === null ? undefined : value;
}

function addToMap<T>(map: Map<string, T[]>, key: string, value: T): void {
  const values = map.get(key);
  if (values) values.push(value);
  else map.set(key, [value]);
}

function boundedLimit(limit: number, maximum = 50): number {
  if (!Number.isFinite(limit)) return 1;
  return Math.max(1, Math.min(maximum, Math.trunc(limit)));
}

function epochMilliseconds(value: number | string | Date): number {
  if (value instanceof Date) return value.getTime();
  if (typeof value === "number") return value;
  const numeric = Number(value);
  if (Number.isFinite(numeric)) return numeric;
  return new Date(value).getTime();
}

function sourcePolicyAllowsDisplay(
  policy: string | Record<string, unknown> | null,
): boolean {
  if (!policy) return false;
  try {
    const parsed = typeof policy === "string" ? JSON.parse(policy) : policy;
    return parsed.display === true;
  } catch {
    return false;
  }
}

export function isDetailFieldDisplayEligible(
  provenance: DetailProvenance | undefined,
): boolean {
  return Boolean(
    provenance &&
      (provenance.state === "present" || provenance.state === "stale") &&
      provenance.evidence?.eligible,
  );
}

export function createCatalogRepository(
  executor: CatalogQueryExecutor,
): CatalogRepository {
  const placeholder = (position: number) =>
    executor.dialect === "sqlite" ? "?" : `$${position}`;

  const inPlaceholders = (count: number) =>
    Array.from({ length: count }, (_, index) => placeholder(index + 1)).join(
      ", ",
    );

  async function queryInChunks<T extends Record<string, unknown>>(
    ids: string[],
    buildStatement: (placeholders: string) => string,
  ): Promise<T[]> {
    const result: T[] = [];
    for (let index = 0; index < ids.length; index += 400) {
      const chunk = ids.slice(index, index + 400);
      if (chunk.length === 0) continue;
      result.push(
        ...(await executor.query<T>(
          buildStatement(inPlaceholders(chunk.length)),
          chunk,
        )),
      );
    }
    return result;
  }

  async function selectWorkRows(params: {
    query: CatalogQuery;
    cursor?: ReturnType<typeof decodeCursor>;
    limit?: number;
  }): Promise<WorkRow[]> {
    const conditions: string[] = [];
    const values: unknown[] = [];
    const search = params.query.q;
    if (search) {
      const escapedSearch = search
        .toLowerCase()
        .replaceAll("\\", "\\\\")
        .replaceAll("%", "\\%")
        .replaceAll("_", "\\_");
      const titlePlaceholder = placeholder(values.length + 1);
      values.push(`%${escapedSearch}%`);
      const titleEscapePlaceholder = placeholder(values.length + 1);
      values.push("\\");
      const authorPlaceholder = placeholder(values.length + 1);
      values.push(`%${escapedSearch}%`);
      const authorEscapePlaceholder = placeholder(values.length + 1);
      values.push("\\");
      conditions.push(`(
        lower(w.preferred_title) like ${titlePlaceholder} escape ${titleEscapePlaceholder}
        or exists (
          select 1
          from work_authors wa_search
          join authors a_search on a_search.id = wa_search.author_id
          where wa_search.work_id = w.id
            and lower(a_search.display_name) like ${authorPlaceholder} escape ${authorEscapePlaceholder}
        )
      )`);
    }
    if (params.query.category) {
      const categoryPlaceholder = placeholder(values.length + 1);
      values.push(params.query.category);
      conditions.push(`exists (
        select 1
        from work_categories wc_filter
        join categories c_filter on c_filter.id = wc_filter.category_id
        where wc_filter.work_id = w.id
          and c_filter.slug = ${categoryPlaceholder}
          and c_filter.status = 'active'
      )`);
    }
    if (params.query.period) {
      const bounds = publicationPeriodBounds(params.query.period);
      if (bounds.from) {
        const fromPlaceholder = placeholder(values.length + 1);
        values.push(bounds.from);
        conditions.push(
          `preferred.publication_sort_date >= ${fromPlaceholder}`,
        );
      }
      if (bounds.before) {
        const beforePlaceholder = placeholder(values.length + 1);
        values.push(bounds.before);
        conditions.push(
          `preferred.publication_sort_date < ${beforePlaceholder}`,
        );
      }
    }
    if (params.cursor) {
      if (params.cursor.sort === "title") {
        const greaterSortPlaceholder = placeholder(values.length + 1);
        values.push(params.cursor.sortTitle);
        const equalSortPlaceholder = placeholder(values.length + 1);
        values.push(params.cursor.sortTitle);
        const idPlaceholder = placeholder(values.length + 1);
        values.push(params.cursor.id);
        conditions.push(`(
          w.sort_title > ${greaterSortPlaceholder}
          or (
            w.sort_title = ${equalSortPlaceholder}
            and w.id > ${idPlaceholder}
          )
        )`);
      } else if (params.cursor.sort === "added") {
        if (params.cursor.catalogedAt === null) {
          const idPlaceholder = placeholder(values.length + 1);
          values.push(params.cursor.id);
          conditions.push(`(
            preferred.cataloged_at is null and w.id > ${idPlaceholder}
          )`);
        } else {
          const cursorValue =
            executor.dialect === "postgres"
              ? new Date(params.cursor.catalogedAt)
              : params.cursor.catalogedAt;
          const lesserAddedPlaceholder = placeholder(values.length + 1);
          values.push(cursorValue);
          const equalAddedPlaceholder = placeholder(values.length + 1);
          values.push(cursorValue);
          const idPlaceholder = placeholder(values.length + 1);
          values.push(params.cursor.id);
          conditions.push(`(
            preferred.cataloged_at < ${lesserAddedPlaceholder}
            or preferred.cataloged_at is null
            or (
              preferred.cataloged_at = ${equalAddedPlaceholder}
              and w.id > ${idPlaceholder}
            )
          )`);
        }
      } else if (params.cursor.publicationSortDate === null) {
        const idPlaceholder = placeholder(values.length + 1);
        values.push(params.cursor.id);
        conditions.push(`(
          preferred.publication_sort_date is null and w.id > ${idPlaceholder}
        )`);
      } else {
        const lesserPublicationPlaceholder = placeholder(values.length + 1);
        values.push(params.cursor.publicationSortDate);
        const equalPublicationPlaceholder = placeholder(values.length + 1);
        values.push(params.cursor.publicationSortDate);
        const idPlaceholder = placeholder(values.length + 1);
        values.push(params.cursor.id);
        conditions.push(`(
          preferred.publication_sort_date < ${lesserPublicationPlaceholder}
          or preferred.publication_sort_date is null
          or (
            preferred.publication_sort_date = ${equalPublicationPlaceholder}
            and w.id > ${idPlaceholder}
          )
        )`);
      }
    }

    let statement = WORK_COLUMNS;
    if (conditions.length > 0) {
      statement += ` where ${conditions.join(" and ")}`;
    }
    if (params.query.sort === "added") {
      statement +=
        " order by (preferred.cataloged_at is null) asc, preferred.cataloged_at desc, w.id asc";
    } else if (params.query.sort === "publication") {
      statement +=
        " order by (preferred.publication_sort_date is null) asc, preferred.publication_sort_date desc, w.id asc";
    } else {
      statement += " order by w.sort_title asc, w.id asc";
    }
    if (params.limit !== undefined) {
      statement += ` limit ${placeholder(values.length + 1)}`;
      values.push(params.limit);
    }
    return executor.query<WorkRow>(statement, values);
  }

  async function countWorkRows(query: CatalogQuery): Promise<number> {
    const rows = await selectWorkRows({ query });
    return rows.length;
  }

  async function loadEditionRowsByIds(ids: string[]): Promise<EditionRow[]> {
    return queryInChunks<EditionRow>(
      ids,
      (values) => `
        select
          e.id as "id",
          e.work_id as "workId",
          e.title as "title",
          e.subtitle as "subtitle",
          e.format as "format",
          e.publication_date as "publicationDate",
          e.publication_precision as "publicationPrecision",
          e.pages as "pages",
          e.cataloged_at as "catalogedAt"
        from editions e
        where e.id in (${values})
        order by e.work_id asc, e.cataloged_at desc, e.id asc
      `,
    );
  }

  async function loadEditionRowsByWorkIds(
    workIds: string[],
  ): Promise<EditionRow[]> {
    return queryInChunks<EditionRow>(
      workIds,
      (values) => `
        select
          e.id as "id",
          e.work_id as "workId",
          e.title as "title",
          e.subtitle as "subtitle",
          e.format as "format",
          e.publication_date as "publicationDate",
          e.publication_precision as "publicationPrecision",
          e.pages as "pages",
          e.cataloged_at as "catalogedAt"
        from editions e
        where e.work_id in (${values})
        order by e.work_id asc, e.cataloged_at desc, e.id asc
      `,
    );
  }

  async function loadProvenanceRows(
    entityType: "work" | "edition",
    entityIds: string[],
  ): Promise<DetailProvenance[]> {
    const rows = await queryInChunks<ProvenanceRow>(
      entityIds,
      (values) => `
        select
          h.entity_type as "entityType",
          h.entity_id as "entityId",
          h.field_key as "field",
          r.state as "state",
          r.reason as "reason",
          r.resolved_at as "resolvedAt",
          s.key as "sourceKey",
          s.name as "sourceName",
          s.approval_state as "sourceApproval",
          o.provenance_kind as "provenanceKind",
          o.state as "observationState",
          o.retrieved_at as "retrievedAt",
          sr.state as "sourceRecordState",
          sl.state as "sourceLinkState",
          s.metadata_policy as "metadataPolicy",
          s.asset_policy as "assetPolicy"
        from field_resolution_heads h
        join field_resolutions r on r.id = h.resolution_id
        left join field_observations o on o.id = r.selected_observation_id
        left join source_records sr on sr.id = o.source_record_id
        left join metadata_sources s on s.id = sr.source_id
        left join source_record_links sl
          on sl.source_record_id = sr.id
         and sl.entity_type = r.entity_type
         and sl.entity_id = r.entity_id
        where h.entity_type = '${entityType}'
          and h.entity_id in (${values})
        order by h.entity_id asc, h.field_key asc
      `,
    );
    return rows.map((row) => ({
      entityType: row.entityType,
      entityId: row.entityId,
      field: row.field,
      state: row.state,
      reason: row.reason,
      resolvedAt: epochMilliseconds(row.resolvedAt),
      evidence:
        row.sourceKey &&
        row.sourceName &&
        row.sourceApproval &&
        row.provenanceKind &&
        row.retrievedAt !== null
          ? {
              sourceKey: row.sourceKey,
              sourceName: row.sourceName,
              sourceApproval: row.sourceApproval,
              kind: row.provenanceKind,
              retrievedAt: epochMilliseconds(row.retrievedAt),
              eligible:
                (row.state === "present"
                  ? row.observationState === "active"
                  : row.state === "stale" &&
                    (row.observationState === "active" ||
                      row.observationState === "stale")) &&
                row.sourceApproval === "approved" &&
                row.sourceRecordState === "active" &&
                row.sourceLinkState === "active" &&
                row.provenanceKind !== "synthetic" &&
                sourcePolicyAllowsDisplay(
                  row.field === "edition.covers"
                    ? row.assetPolicy
                    : row.metadataPolicy,
                ),
            }
          : undefined,
    }));
  }

  function applyDetailEligibility(
    detail: Omit<WorkDetail, "provenance">,
    provenance: DetailProvenance[],
  ): WorkDetail | undefined {
    const byTargetField = new Map(
      provenance.map((item) => [
        `${item.entityType}:${item.entityId}:${item.field}`,
        item,
      ]),
    );
    const eligible = (
      entityType: "work" | "edition",
      entityId: string,
      field: DetailProvenance["field"],
    ) =>
      isDetailFieldDisplayEligible(
        byTargetField.get(`${entityType}:${entityId}:${field}`),
      );

    if (!eligible("work", detail.id, "work.preferred_title")) return undefined;

    const editions = detail.editions.map((edition) => ({
      ...edition,
      title: eligible("edition", edition.id, "edition.title")
        ? edition.title
        : undefined,
      subtitle: eligible("edition", edition.id, "edition.subtitle")
        ? edition.subtitle
        : undefined,
      format: eligible("edition", edition.id, "edition.format")
        ? edition.format
        : undefined,
      publication: eligible("edition", edition.id, "edition.publication_date")
        ? edition.publication
        : undefined,
      pages: eligible("edition", edition.id, "edition.pages")
        ? edition.pages
        : undefined,
      publishers: eligible("edition", edition.id, "edition.publishers")
        ? edition.publishers
        : [],
      languages: eligible("edition", edition.id, "edition.languages")
        ? edition.languages
        : [],
      identifiers: eligible("edition", edition.id, "edition.identifiers")
        ? edition.identifiers
        : [],
      cover: eligible("edition", edition.id, "edition.covers")
        ? edition.cover
        : undefined,
    }));
    const preferredEdition =
      detail.preferredEdition &&
      eligible("work", detail.id, "work.preferred_edition")
        ? editions.find((edition) => edition.id === detail.preferredEdition?.id)
        : undefined;
    const categories = eligible("work", detail.id, "work.categories")
      ? detail.categories
      : [];

    return {
      ...detail,
      authors: eligible("work", detail.id, "work.authors")
        ? detail.authors
        : [],
      primaryCategory: categories.find((category) => category.isPrimary),
      preferredEdition,
      description: eligible("work", detail.id, "work.description")
        ? detail.description
        : undefined,
      categories,
      editions,
      provenance,
    };
  }

  async function projectWorks(
    workRows: WorkRow[],
    options: { includeAllEditions?: boolean } = {},
  ): Promise<ProjectedWork[]> {
    if (workRows.length === 0) return [];
    const workIds = workRows.map((row) => row.id);
    const preferredEditionIds = workRows
      .map((row) => row.preferredEditionId)
      .filter((id): id is string => Boolean(id));

    const [authorRows, categoryRows, editionRows] = await Promise.all([
      queryInChunks<AuthorRow>(
        workIds,
        (values) => `
          select
            wa.work_id as "workId",
            a.id as "id",
            a.display_name as "name",
            wa.role as "role",
            wa.position as "position"
          from work_authors wa
          join authors a on a.id = wa.author_id
          where wa.work_id in (${values})
          order by wa.work_id asc, wa.position asc, a.id asc
        `,
      ),
      queryInChunks<CategoryRow>(
        workIds,
        (values) => `
          select
            wc.work_id as "workId",
            c.id as "id",
            c.slug as "slug",
            c.label as "label",
            wc.position as "position",
            wc.is_primary as "isPrimary"
          from work_categories wc
          join categories c on c.id = wc.category_id
          where wc.work_id in (${values}) and c.status = 'active'
          order by wc.work_id asc, wc.position asc, c.id asc
        `,
      ),
      options.includeAllEditions
        ? loadEditionRowsByWorkIds(workIds)
        : loadEditionRowsByIds(preferredEditionIds),
    ]);

    const editionIds = editionRows.map((row) => row.id);
    const [publisherRows, languageRows, identifierRows, coverRows] =
      await Promise.all([
        queryInChunks<PublisherRow>(
          editionIds,
          (values) => `
            select
              ep.edition_id as "editionId",
              p.id as "id",
              p.display_name as "name",
              ep.role as "role",
              ep.position as "position"
            from edition_publishers ep
            join publishers p on p.id = ep.publisher_id
            where ep.edition_id in (${values})
            order by ep.edition_id asc, ep.position asc, p.id asc
          `,
        ),
        queryInChunks<LanguageRow>(
          editionIds,
          (values) => `
            select
              el.edition_id as "editionId",
              l.tag as "tag",
              l.label as "label",
              el.position as "position"
            from edition_languages el
            join languages l on l.tag = el.language_tag
            where el.edition_id in (${values})
            order by el.edition_id asc, el.position asc, l.tag asc
          `,
        ),
        queryInChunks<IdentifierRow>(
          editionIds,
          (values) => `
            select
              ei.edition_id as "editionId",
              ei.id as "id",
              ei.scheme as "scheme",
              ei.value_normalized as "value",
              ei.value_display as "displayValue",
              ei.is_primary as "isPrimary"
            from edition_identifiers ei
            where ei.edition_id in (${values})
            order by ei.edition_id asc, ei.is_primary desc, ei.scheme asc, ei.id asc
          `,
        ),
        queryInChunks<CoverRow>(
          editionIds,
          (values) => `
            select
              ec.edition_id as "editionId",
              ca.id as "id",
              ca.object_key as "objectKey",
              ca.media_type as "mediaType",
              ca.width as "width",
              ca.height as "height"
            from edition_covers ec
            join cover_assets ca on ca.id = ec.cover_asset_id
            where ec.edition_id in (${values})
              and ec.is_primary = true
              and ca.state = 'available'
            order by ec.edition_id asc, ec.position asc, ca.id asc
          `,
        ),
      ]);

    const authorsByWork = new Map<string, WorkAuthor[]>();
    for (const row of authorRows) {
      addToMap(authorsByWork, row.workId, {
        id: row.id,
        name: row.name,
        role: row.role,
        position: row.position,
      });
    }

    const categoriesByWork = new Map<string, WorkCategory[]>();
    for (const row of categoryRows) {
      addToMap(categoriesByWork, row.workId, {
        id: row.id,
        slug: row.slug,
        label: row.label,
        position: row.position,
        isPrimary: Boolean(row.isPrimary),
      });
    }

    const publishersByEdition = new Map<string, EditionPublisher[]>();
    for (const row of publisherRows) {
      addToMap(publishersByEdition, row.editionId, {
        id: row.id,
        name: row.name,
        role: optional(row.role),
        position: row.position,
      });
    }

    const languagesByEdition = new Map<string, EditionLanguage[]>();
    for (const row of languageRows) {
      addToMap(languagesByEdition, row.editionId, {
        tag: row.tag,
        label: row.label,
        position: row.position,
      });
    }

    const identifiersByEdition = new Map<string, EditionIdentifier[]>();
    for (const row of identifierRows) {
      addToMap(identifiersByEdition, row.editionId, {
        id: row.id,
        scheme: row.scheme,
        value: row.value,
        displayValue: optional(row.displayValue),
        isPrimary: Boolean(row.isPrimary),
      });
    }

    const coversByEdition = new Map<string, EditionCover>();
    for (const row of coverRows) {
      if (coversByEdition.has(row.editionId)) continue;
      coversByEdition.set(row.editionId, {
        id: row.id,
        objectKey: row.objectKey,
        mediaType: optional(row.mediaType),
        width: optional(row.width),
        height: optional(row.height),
      });
    }

    const editionsById = new Map<string, EditionSummary>();
    const editionsByWork = new Map<string, EditionSummary[]>();
    for (const row of editionRows) {
      const edition: EditionSummary = {
        id: row.id,
        title: optional(row.title),
        subtitle: optional(row.subtitle),
        format: optional(row.format),
        publication:
          row.publicationDate && row.publicationPrecision
            ? {
                date: row.publicationDate,
                precision: row.publicationPrecision,
              }
            : undefined,
        pages: optional(row.pages),
        catalogedAt: Number(row.catalogedAt),
        publishers: publishersByEdition.get(row.id) ?? [],
        languages: languagesByEdition.get(row.id) ?? [],
        identifiers: identifiersByEdition.get(row.id) ?? [],
        cover: coversByEdition.get(row.id),
      };
      editionsById.set(row.id, edition);
      addToMap(editionsByWork, row.workId, edition);
    }

    return workRows.map((row) => {
      const categories = categoriesByWork.get(row.id) ?? [];
      const preferredEdition = row.preferredEditionId
        ? editionsById.get(row.preferredEditionId)
        : undefined;
      const summary: WorkSummary = {
        id: row.id,
        title: row.title,
        authors: authorsByWork.get(row.id) ?? [],
        primaryCategory: categories.find((category) => category.isPrimary),
        preferredEdition,
      };
      if (!options.includeAllEditions) return summary;
      const allEditions = editionsByWork.get(row.id) ?? [];
      allEditions.sort((left, right) => {
        if (left.id === row.preferredEditionId) return -1;
        if (right.id === row.preferredEditionId) return 1;
        return (
          right.catalogedAt - left.catalogedAt ||
          left.id.localeCompare(right.id)
        );
      });
      return {
        ...summary,
        description: optional(row.description),
        categories,
        editions: allEditions,
      } satisfies Omit<WorkDetail, "provenance">;
    });
  }

  return {
    async listWorkSummaries(query = { sort: "title" }) {
      const rows = await selectWorkRows({ query });
      return (await projectWorks(rows)) as WorkSummary[];
    },

    async pageWorkSummaries({ query, after, limit }) {
      const cursor = decodeCursor(after, query);
      const queryKey = catalogQueryKey(query);
      const pageSize = boundedLimit(limit);
      const [rows, total] = await Promise.all([
        selectWorkRows({
          query,
          cursor,
          limit: pageSize + 1,
        }),
        countWorkRows(query),
      ]);
      const hasNext = rows.length > pageSize;
      const pageRows = rows.slice(0, pageSize);
      const items = (await projectWorks(pageRows)) as WorkSummary[];
      const last = pageRows.at(-1);
      const nextCursor =
        hasNext && last
          ? query.sort === "added"
            ? encodeCursor({
                version: 2,
                queryKey,
                sort: "added",
                catalogedAt:
                  last.catalogedAt === null ? null : Number(last.catalogedAt),
                id: last.id,
              })
            : query.sort === "publication"
              ? encodeCursor({
                  version: 2,
                  queryKey,
                  sort: "publication",
                  publicationSortDate: last.publicationSortDate,
                  id: last.id,
                })
              : encodeCursor({
                  version: 2,
                  queryKey,
                  sort: "title",
                  sortTitle: last.sortTitle,
                  id: last.id,
                })
          : undefined;
      return {
        items,
        hasNext,
        nextCursor,
        total,
      };
    },

    async listCategories() {
      return executor.query<CatalogCategory>(`
        select slug as "slug", label as "label"
        from categories
        where status = 'active'
        order by label asc, slug asc
      `);
    },

    async listNewArrivals(limit = 24) {
      const pageSize = boundedLimit(limit);
      const rows = await executor.query<WorkRow>(
        `${WORK_COLUMNS}
          where w.preferred_edition_id is not null
          order by preferred.cataloged_at desc, w.id asc
          limit ${placeholder(1)}
        `,
        [pageSize],
      );
      return (await projectWorks(rows)) as WorkSummary[];
    },

    async getWorkDetail(id) {
      const rows = await executor.query<WorkRow>(
        `${WORK_COLUMNS} where w.id = ${placeholder(1)} limit 1`,
        [id],
      );
      const projected = (await projectWorks(rows, {
        includeAllEditions: true,
      })) as Array<Omit<WorkDetail, "provenance">>;
      const detail = projected[0];
      if (!detail) return undefined;
      const [workProvenance, editionProvenance] = await Promise.all([
        loadProvenanceRows("work", [detail.id]),
        loadProvenanceRows(
          "edition",
          detail.editions.map((edition) => edition.id),
        ),
      ]);
      return applyDetailEligibility(detail, [
        ...workProvenance,
        ...editionProvenance,
      ]);
    },
  };
}
