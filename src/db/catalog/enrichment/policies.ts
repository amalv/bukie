import { canonicalJson, deterministicCatalogId } from "../identity";
import type {
  AdapterManifest,
  EnrichmentFieldClass,
  FieldPermission,
} from "./types";

const POLICY_REVIEW_DATE = "2026-07-28";
const NEXT_POLICY_REVIEW_DATE = "2027-01-28";

const denied = (): FieldPermission => ({
  allowedFields: [],
  fetch: false,
  cache: false,
  retain: "none",
  transform: false,
  display: false,
});

const pendingManifest = (input: {
  sourceKey: string;
  sourceName: string;
  adapterId: string;
  disabledReason: string;
}): AdapterManifest => ({
  sourceId: deterministicCatalogId(
    "metadata_source",
    "enrichment",
    input.sourceKey,
  ),
  sourceKey: input.sourceKey,
  sourceName: input.sourceName,
  adapterId: input.adapterId,
  adapterVersion: "1.0.0",
  sourcePolicyVersion: "pending-2026-07-28",
  policyReviewDate: POLICY_REVIEW_DATE,
  policySources: [],
  state: "pending",
  disabledReason: input.disabledReason,
  nextReviewDate: NEXT_POLICY_REVIEW_DATE,
  permissions: {
    metadata: denied(),
    text: denied(),
    asset: denied(),
  },
  acquisition: {
    method: "disabled",
    host: null,
    perHostConcurrency: 1,
    minimumIntervalMs: 0,
    credentials: [],
    cache: false,
    conditionalRetrieval: "none",
    retry: {
      ceiling: 0,
      baseDelayMs: 0,
      maximumDelayMs: 0,
      jitterRatio: 0,
      respectRetryAfter: true,
    },
  },
  attribution: {
    required: false,
    text: null,
    url: null,
    placement: null,
  },
  withdrawal: {
    tombstone: true,
    purgeRawPayload: true,
    purgeCachedAssets: true,
    recomputeProposals: true,
  },
  sourceRevision: { kind: "provider_revision", required: true },
  proposedEvidenceOnly: true,
});

export const BUKIE_EDITORIAL_ADAPTER = {
  sourceId: deterministicCatalogId(
    "metadata_source",
    "enrichment",
    "bukie_editorial",
  ),
  sourceKey: "bukie_editorial",
  sourceName: "Bukie-owned editorial evidence",
  adapterId: "bukie.editorial",
  adapterVersion: "1.0.0",
  sourcePolicyVersion: "bukie-editorial-2026-07-28",
  policyReviewDate: POLICY_REVIEW_DATE,
  policySources: ["docs/research/book-detail-enrichment.md"],
  state: "enabled",
  disabledReason: null,
  nextReviewDate: NEXT_POLICY_REVIEW_DATE,
  permissions: {
    metadata: {
      allowedFields: ["work.preferred_title"],
      fetch: true,
      cache: true,
      retain: "selected_fields",
      transform: true,
      display: true,
    },
    text: {
      allowedFields: ["work.description"],
      fetch: true,
      cache: true,
      retain: "full",
      transform: true,
      display: true,
    },
    asset: denied(),
  },
  acquisition: {
    method: "repository_artifact",
    host: null,
    perHostConcurrency: 1,
    minimumIntervalMs: 0,
    credentials: [],
    cache: true,
    conditionalRetrieval: "snapshot",
    retry: {
      ceiling: 0,
      baseDelayMs: 0,
      maximumDelayMs: 0,
      jitterRatio: 0,
      respectRetryAfter: true,
    },
  },
  attribution: {
    required: true,
    text: "Bukie editorial",
    url: null,
    placement: "internal evidence audit",
  },
  withdrawal: {
    tombstone: true,
    purgeRawPayload: false,
    purgeCachedAssets: true,
    recomputeProposals: true,
  },
  sourceRevision: { kind: "content_hash", required: true },
  proposedEvidenceOnly: true,
} as const satisfies AdapterManifest;

export const WIKIDATA_WORK_FACTS_ADAPTER = {
  sourceId: deterministicCatalogId("metadata_source", "enrichment", "wikidata"),
  sourceKey: "wikidata",
  sourceName: "Wikidata structured work facts",
  adapterId: "wikidata.work-facts",
  adapterVersion: "1.0.0",
  sourcePolicyVersion: "wikidata-cc0-2026-07-28",
  policyReviewDate: POLICY_REVIEW_DATE,
  policySources: [
    "https://www.wikidata.org/wiki/Wikidata:Licensing",
    "https://www.wikidata.org/wiki/Wikidata:Data_access",
  ],
  state: "enabled",
  disabledReason: null,
  nextReviewDate: NEXT_POLICY_REVIEW_DATE,
  permissions: {
    metadata: {
      allowedFields: ["work.preferred_title"],
      fetch: true,
      cache: true,
      retain: "full",
      transform: true,
      display: false,
    },
    text: denied(),
    asset: denied(),
  },
  acquisition: {
    method: "wikimedia_api",
    host: "www.wikidata.org",
    perHostConcurrency: 1,
    minimumIntervalMs: 1_000,
    credentials: [],
    cache: true,
    conditionalRetrieval: "etag_and_last_modified",
    retry: {
      ceiling: 3,
      baseDelayMs: 1_000,
      maximumDelayMs: 30_000,
      jitterRatio: 0.2,
      respectRetryAfter: true,
    },
  },
  attribution: {
    required: false,
    text: "Wikidata",
    url: "https://www.wikidata.org/",
    placement: "internal evidence audit",
  },
  withdrawal: {
    tombstone: true,
    purgeRawPayload: false,
    purgeCachedAssets: true,
    recomputeProposals: true,
  },
  sourceRevision: { kind: "provider_revision", required: true },
  proposedEvidenceOnly: true,
} as const satisfies AdapterManifest;

export const PENDING_ADAPTERS = [
  pendingManifest({
    sourceKey: "open_library_metadata",
    sourceName: "Open Library metadata",
    adapterId: "open-library.metadata",
    disabledReason:
      "Metadata retention, display, and bulk-access policy require separate approval",
  }),
  pendingManifest({
    sourceKey: "open_library_descriptions",
    sourceName: "Open Library descriptions",
    adapterId: "open-library.descriptions",
    disabledReason:
      "Contributed prose may retain third-party rights; no approved text policy exists",
  }),
  pendingManifest({
    sourceKey: "open_library_covers",
    sourceName: "Open Library Covers",
    adapterId: "open-library.covers",
    disabledReason:
      "Asset identity, caching, transformation, and display rights require separate approval",
  }),
  pendingManifest({
    sourceKey: "google_books",
    sourceName: "Google Books",
    adapterId: "google-books",
    disabledReason:
      "Caching, branding, quota, retention, and third-party-content terms are pending",
  }),
  pendingManifest({
    sourceKey: "official_publishers",
    sourceName: "Official publisher text and assets",
    adapterId: "publisher.official",
    disabledReason:
      "Public pages are not an approved feed or reusable text/asset license",
  }),
  pendingManifest({
    sourceKey: "worldcat_oclc",
    sourceName: "WorldCat/OCLC data",
    adapterId: "worldcat.oclc",
    disabledReason: "Licensed API and data-use terms are not approved",
  }),
  pendingManifest({
    sourceKey: "commercial_isbn",
    sourceName: "Bowker and commercial ISBN feeds",
    adapterId: "isbn.commercial",
    disabledReason:
      "Contract scope, retention, display, and withdrawal terms are not approved",
  }),
  pendingManifest({
    sourceKey: "wikipedia_prose",
    sourceName: "Wikipedia prose",
    adapterId: "wikipedia.prose",
    disabledReason:
      "CC BY-SA attribution, share-alike, copying, spoiler, and drift policy is not approved",
  }),
  pendingManifest({
    sourceKey: "retailer_competitor_search",
    sourceName: "Retailer, competitor, and search-result content",
    adapterId: "web-content.retailer-competitor-search",
    disabledReason:
      "Scraping and catalog ingestion from these surfaces are prohibited",
  }),
] as const;

export const ENRICHMENT_ADAPTERS = [
  BUKIE_EDITORIAL_ADAPTER,
  WIKIDATA_WORK_FACTS_ADAPTER,
  ...PENDING_ADAPTERS,
] as const satisfies readonly AdapterManifest[];

const adaptersById = new Map<string, AdapterManifest>(
  ENRICHMENT_ADAPTERS.map((adapter) => [adapter.adapterId, adapter]),
);

export function getAdapterManifest(adapterId: string): AdapterManifest {
  const adapter = adaptersById.get(adapterId);
  if (!adapter) {
    throw new Error(`Enrichment policy refused: unknown adapter ${adapterId}`);
  }
  return adapter;
}

export function assertAdapterEnabled(adapter: AdapterManifest): void {
  if (adapter.state !== "enabled") {
    throw new Error(
      `Enrichment policy refused: ${adapter.adapterId} is ${adapter.state}: ${adapter.disabledReason ?? "no approved policy"}`,
    );
  }
}

export function authorizeField(input: {
  adapter: AdapterManifest;
  fieldClass: EnrichmentFieldClass;
  fieldKey: string;
}): FieldPermission {
  assertAdapterEnabled(input.adapter);
  const permission = input.adapter.permissions[input.fieldClass];
  if (
    !permission.fetch ||
    !permission.allowedFields.includes(
      input.fieldKey as (typeof permission.allowedFields)[number],
    )
  ) {
    throw new Error(
      `Enrichment policy refused: ${input.adapter.adapterId} may not acquire ${input.fieldClass} field ${input.fieldKey}`,
    );
  }
  return permission;
}

export function metadataSourceRow(
  adapter: AdapterManifest,
): Record<string, unknown> {
  const metadataPolicy = canonicalJson({
    acquisition: adapter.acquisition,
    adapterId: adapter.adapterId,
    adapterVersion: adapter.adapterVersion,
    attribution: adapter.attribution,
    cache: adapter.permissions.metadata.cache || adapter.permissions.text.cache,
    display:
      adapter.permissions.metadata.display || adapter.permissions.text.display,
    fieldPermission: adapter.permissions.metadata,
    nextReviewDate: adapter.nextReviewDate,
    policyReviewDate: adapter.policyReviewDate,
    policySources: adapter.policySources,
    proposedEvidenceOnly: adapter.proposedEvidenceOnly,
    sourceRevision: adapter.sourceRevision,
    sourcePolicyVersion: adapter.sourcePolicyVersion,
    textPermission: adapter.permissions.text,
    transform:
      adapter.permissions.metadata.transform ||
      adapter.permissions.text.transform,
    withdrawal: adapter.withdrawal,
  });
  const assetPolicy = canonicalJson({
    cache: adapter.permissions.asset.cache,
    display: adapter.permissions.asset.display,
    fieldPermission: adapter.permissions.asset,
    purgeOnWithdrawal: adapter.withdrawal.purgeCachedAssets,
    transform: adapter.permissions.asset.transform,
    withdrawal: adapter.withdrawal,
  });
  const payloadPolicies = Object.values(adapter.permissions).map(
    (permission) => permission.retain,
  );
  const payloadPolicy = payloadPolicies.includes("full")
    ? "full"
    : payloadPolicies.includes("selected_fields")
      ? "selected_fields"
      : "none";
  return {
    id: adapter.sourceId,
    key: adapter.sourceKey,
    name: adapter.sourceName,
    termsUrl: adapter.policySources[0] ?? null,
    attributionUrl: adapter.attribution.url,
    reviewedAt: Date.parse(`${adapter.policyReviewDate}T00:00:00Z`),
    approvalState: adapter.state === "enabled" ? "approved" : adapter.state,
    metadataPolicy,
    assetPolicy,
    payloadPolicy,
    refreshIntervalMs: null,
  };
}
