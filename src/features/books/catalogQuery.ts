export const CATALOG_SORTS = ["title", "added", "publication"] as const;
export type CatalogSort = (typeof CATALOG_SORTS)[number];

export const DEFAULT_CATALOG_SORT: CatalogSort = "title";

export const PUBLICATION_PERIODS = [
  {
    value: "before-1950",
    label: "Before 1950",
    before: "1950-01-01",
  },
  {
    value: "1950-1999",
    label: "1950–1999",
    from: "1950-01-01",
    before: "2000-01-01",
  },
  {
    value: "2000-2009",
    label: "2000–2009",
    from: "2000-01-01",
    before: "2010-01-01",
  },
  {
    value: "2010-2019",
    label: "2010–2019",
    from: "2010-01-01",
    before: "2020-01-01",
  },
  {
    value: "2020-present",
    label: "2020–present",
    from: "2020-01-01",
  },
] as const;

export type PublicationPeriod = (typeof PUBLICATION_PERIODS)[number]["value"];

export type CatalogQuery = {
  q?: string;
  category?: string;
  period?: PublicationPeriod;
  sort: CatalogSort;
};

export type CatalogCategory = {
  slug: string;
  label: string;
};

type SearchParamsRecord = Record<string, string | string[] | null | undefined>;

type SearchParamsReader = {
  get(name: string): string | null;
};

const categorySlugPattern = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

function readParam(
  source: SearchParamsRecord | SearchParamsReader,
  name: string,
): string | undefined {
  const reader = source as SearchParamsReader;
  if (typeof reader.get === "function") {
    return reader.get(name) ?? undefined;
  }
  const value = (source as SearchParamsRecord)[name];
  return Array.isArray(value) ? value[0] : (value ?? undefined);
}

function normalizeOptionalText(value: string | undefined): string | undefined {
  const normalized = value?.trim().replace(/\s+/g, " ");
  return normalized ? normalized.slice(0, 200) : undefined;
}

function normalizeCategory(value: string | undefined): string | undefined {
  const normalized = value?.trim().toLowerCase();
  if (
    !normalized ||
    normalized.length > 80 ||
    !categorySlugPattern.test(normalized)
  ) {
    return undefined;
  }
  return normalized;
}

function isCatalogSort(value: string | undefined): value is CatalogSort {
  return CATALOG_SORTS.some((sort) => sort === value);
}

function isPublicationPeriod(
  value: string | undefined,
): value is PublicationPeriod {
  return PUBLICATION_PERIODS.some((period) => period.value === value);
}

export function parseCatalogQuery(
  source: SearchParamsRecord | SearchParamsReader,
): CatalogQuery {
  const sort = readParam(source, "sort");
  const period = readParam(source, "period");
  return {
    q: normalizeOptionalText(readParam(source, "q")),
    category: normalizeCategory(readParam(source, "category")),
    period: isPublicationPeriod(period) ? period : undefined,
    sort: isCatalogSort(sort) ? sort : DEFAULT_CATALOG_SORT,
  };
}

export function serializeCatalogQuery(query: CatalogQuery): URLSearchParams {
  const params = new URLSearchParams();
  if (query.q) params.set("q", query.q);
  if (query.category) params.set("category", query.category);
  if (query.period) params.set("period", query.period);
  if (query.sort !== DEFAULT_CATALOG_SORT) params.set("sort", query.sort);
  return params;
}

export function catalogQueryKey(query: CatalogQuery): string {
  return serializeCatalogQuery(query).toString();
}

export function serializeCatalogPageQuery(
  query: CatalogQuery,
  pagination: { after?: string; limit: number },
): URLSearchParams {
  const params = serializeCatalogQuery(query);
  if (pagination.after) params.set("after", pagination.after);
  params.set("limit", String(pagination.limit));
  return params;
}

export function publicationPeriodBounds(period: PublicationPeriod): {
  from?: string;
  before?: string;
} {
  const match = PUBLICATION_PERIODS.find(
    (candidate) => candidate.value === period,
  );
  return {
    from: match && "from" in match ? match.from : undefined,
    before: match && "before" in match ? match.before : undefined,
  };
}

export function publicationPeriodLabel(period: PublicationPeriod): string {
  return (
    PUBLICATION_PERIODS.find((candidate) => candidate.value === period)
      ?.label ?? period
  );
}

export function catalogSortLabel(sort: CatalogSort): string {
  switch (sort) {
    case "added":
      return "Newest catalog additions";
    case "publication":
      return "Publication date (newest)";
    default:
      return "Title (A–Z)";
  }
}

export function hasCatalogFilters(query: CatalogQuery): boolean {
  return Boolean(query.q || query.category || query.period);
}
