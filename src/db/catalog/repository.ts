import {
  decodeCursor,
  encodeCursor,
  type PageResult,
} from "@/features/books/pagination";
import type {
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

export type CatalogRepository = {
  listWorkSummaries(query?: string): Promise<WorkSummary[]>;
  pageWorkSummaries(params: {
    query?: string;
    after?: string | null;
    limit: number;
  }): Promise<PageResult<WorkSummary>>;
  listNewArrivals(limit?: number): Promise<WorkSummary[]>;
  getWorkDetail(id: string): Promise<WorkDetail | undefined>;
};

const WORK_COLUMNS = `
  select
    w.id as "id",
    w.preferred_title as "title",
    w.sort_title as "sortTitle",
    w.description as "description",
    w.preferred_edition_id as "preferredEditionId"
  from works w
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
    query?: string;
    cursor?: { sortTitle: string; id: string } | null;
    limit?: number;
  }): Promise<WorkRow[]> {
    const conditions: string[] = [];
    const values: unknown[] = [];
    const search = params.query?.trim();
    if (search) {
      const titlePlaceholder = placeholder(values.length + 1);
      values.push(`%${search.toLowerCase()}%`);
      const authorPlaceholder = placeholder(values.length + 1);
      values.push(`%${search.toLowerCase()}%`);
      conditions.push(`(
        lower(w.preferred_title) like ${titlePlaceholder}
        or exists (
          select 1
          from work_authors wa_search
          join authors a_search on a_search.id = wa_search.author_id
          where wa_search.work_id = w.id
            and lower(a_search.display_name) like ${authorPlaceholder}
        )
      )`);
    }
    if (params.cursor) {
      const greaterSortPlaceholder = placeholder(values.length + 1);
      values.push(params.cursor.sortTitle);
      const equalSortPlaceholder = placeholder(values.length + 1);
      values.push(params.cursor.sortTitle);
      const idPlaceholder = placeholder(values.length + 1);
      values.push(params.cursor.id);
      conditions.push(`(
        w.sort_title > ${greaterSortPlaceholder}
        or (w.sort_title = ${equalSortPlaceholder} and w.id > ${idPlaceholder})
      )`);
    }

    let statement = WORK_COLUMNS;
    if (conditions.length > 0) {
      statement += ` where ${conditions.join(" and ")}`;
    }
    statement += " order by w.sort_title asc, w.id asc";
    if (params.limit !== undefined) {
      statement += ` limit ${placeholder(values.length + 1)}`;
      values.push(params.limit);
    }
    return executor.query<WorkRow>(statement, values);
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

  async function projectWorks(
    workRows: WorkRow[],
    options: { includeAllEditions?: boolean } = {},
  ): Promise<Array<WorkSummary | WorkDetail>> {
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
      } satisfies WorkDetail;
    });
  }

  return {
    async listWorkSummaries(query) {
      const rows = await selectWorkRows({ query });
      return (await projectWorks(rows)) as WorkSummary[];
    },

    async pageWorkSummaries({ query, after, limit }) {
      const cursor = decodeCursor(after);
      const pageSize = boundedLimit(limit);
      const rows = await selectWorkRows({
        query,
        cursor,
        limit: pageSize + 1,
      });
      const hasNext = rows.length > pageSize;
      const pageRows = rows.slice(0, pageSize);
      const items = (await projectWorks(pageRows)) as WorkSummary[];
      const last = pageRows.at(-1);
      return {
        items,
        hasNext,
        nextCursor:
          hasNext && last
            ? encodeCursor({ sortTitle: last.sortTitle, id: last.id })
            : undefined,
      };
    },

    async listNewArrivals(limit = 24) {
      const pageSize = boundedLimit(limit);
      const rows = await executor.query<WorkRow>(
        `${WORK_COLUMNS}
          join editions preferred on preferred.id = w.preferred_edition_id
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
      })) as WorkDetail[];
      return projected[0];
    },
  };
}
