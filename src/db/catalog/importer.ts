import type { LegacyCatalogArtifactRecord } from "@/../artifacts/catalog/types";
import {
  canonicalJson,
  deterministicCatalogId,
  hashCanonicalJson,
} from "./identity";
import {
  isGeneratedLegacyDescription,
  isProviderNeutralCoverKey,
  normalizeSortText,
  normalizeValidIsbn,
  parsePartialDate,
  slugifyCatalogValue,
} from "./normalize";
import { validateCatalogImportGraph } from "./validate-graph";
import type {
  CatalogEntityType,
  CatalogFieldKey,
  ObservationState,
  ProvenanceKind,
  ResolutionState,
} from "./values";

export const CATALOG_IMPORTER_VERSION = "legacy-catalog-v1";
export const CATALOG_RESOLVER_VERSION = "catalog-resolver-v1";
export const CATALOG_ARTIFACT_TIMESTAMP = Date.UTC(2026, 6, 26);

export type ImportAuthor = {
  name: string;
  key?: string;
  role?: "author" | "editor" | "translator" | "illustrator";
};

export type ImportCategory = {
  label: string;
  slug?: string;
  isPrimary?: boolean;
};

export type ImportPublisher = {
  name: string;
  key?: string;
  role?: "publisher" | "co_publisher" | "imprint" | "distributor";
};

export type CatalogImportRecord = {
  sourceKey: "legacy_catalog";
  recordKey: string;
  workKey?: string;
  title: string;
  authors: ImportAuthor[];
  categories: ImportCategory[];
  description?: string;
  generatedDescription?: boolean;
  publicationDate?: string | number;
  pages?: number;
  publishers?: ImportPublisher[];
  languages?: Array<{ tag: string; label: string }>;
  isbn?: string;
  coverObjectKey?: string;
  format?: "hardcover" | "paperback" | "ebook" | "audiobook" | "other";
  rating?: number;
  ratingsCount?: number;
  catalogedAt?: number;
};

export type CatalogImportGraph = {
  metadataSources: Array<Record<string, unknown>>;
  works: Array<Record<string, unknown>>;
  editions: Array<Record<string, unknown>>;
  authors: Array<Record<string, unknown>>;
  workAuthors: Array<Record<string, unknown>>;
  categories: Array<Record<string, unknown>>;
  workCategories: Array<Record<string, unknown>>;
  publishers: Array<Record<string, unknown>>;
  editionPublishers: Array<Record<string, unknown>>;
  languages: Array<Record<string, unknown>>;
  editionLanguages: Array<Record<string, unknown>>;
  editionIdentifiers: Array<Record<string, unknown>>;
  coverAssets: Array<Record<string, unknown>>;
  editionCovers: Array<Record<string, unknown>>;
  sourceRecords: Array<Record<string, unknown>>;
  sourceRecordLinks: Array<Record<string, unknown>>;
  fieldObservations: Array<Record<string, unknown>>;
  fieldResolutions: Array<Record<string, unknown>>;
  fieldResolutionHeads: Array<Record<string, unknown>>;
  entityAliases: Array<Record<string, unknown>>;
  catalogChangeEvents: Array<Record<string, unknown>>;
};

const SOURCE_KEYS = [
  "legacy_catalog",
  "bukie_curated",
  "bukie_derivation",
] as const;

function sourceId(key: (typeof SOURCE_KEYS)[number]) {
  return deterministicCatalogId("metadata_source", "bukie", key);
}

function sourceRecordId(sourceKey: string, recordKey: string) {
  return deterministicCatalogId("source_record", sourceKey, recordKey);
}

function pushUnique(
  target: Array<Record<string, unknown>>,
  seen: Set<string>,
  key: string,
  row: Record<string, unknown>,
) {
  if (seen.has(key)) return;
  seen.add(key);
  target.push(row);
}

function sourcePolicies(): Array<Record<string, unknown>> {
  const internalPolicy = canonicalJson({
    accessMethod: "repository_artifact",
    attribution: null,
    cache: true,
    deletionBehavior: "retain_audit",
    display: true,
    requestLimit: null,
    transform: true,
  });
  const noAssets = canonicalJson({
    cache: false,
    display: false,
    purgeOnWithdrawal: true,
    transform: false,
  });
  const legacyAssets = canonicalJson({
    cache: true,
    display: true,
    objectKeys: "provider_neutral_only",
    purgeOnWithdrawal: false,
    transform: false,
  });

  return [
    {
      id: sourceId("legacy_catalog"),
      key: "legacy_catalog",
      name: "Bukie legacy catalog artifact",
      termsUrl: null,
      attributionUrl: null,
      reviewedAt: CATALOG_ARTIFACT_TIMESTAMP,
      approvalState: "approved",
      metadataPolicy: internalPolicy,
      assetPolicy: legacyAssets,
      payloadPolicy: "selected_fields",
      refreshIntervalMs: null,
    },
    {
      id: sourceId("bukie_curated"),
      key: "bukie_curated",
      name: "Bukie curated catalog",
      termsUrl: null,
      attributionUrl: null,
      reviewedAt: CATALOG_ARTIFACT_TIMESTAMP,
      approvalState: "approved",
      metadataPolicy: internalPolicy,
      assetPolicy: noAssets,
      payloadPolicy: "selected_fields",
      refreshIntervalMs: null,
    },
    {
      id: sourceId("bukie_derivation"),
      key: "bukie_derivation",
      name: "Bukie catalog derivations",
      termsUrl: null,
      attributionUrl: null,
      reviewedAt: CATALOG_ARTIFACT_TIMESTAMP,
      approvalState: "approved",
      metadataPolicy: internalPolicy,
      assetPolicy: noAssets,
      payloadPolicy: "selected_fields",
      refreshIntervalMs: null,
    },
  ];
}

export function legacyBooksToImportRecords(
  books: LegacyCatalogArtifactRecord[],
): CatalogImportRecord[] {
  return books.map((book) => ({
    sourceKey: "legacy_catalog",
    recordKey: book.id,
    title: book.title,
    authors: (book.authors?.length ? book.authors : [book.author]).map(
      (name) => ({ name }),
    ),
    categories: book.genre ? [{ label: book.genre, isPrimary: true }] : [],
    description: book.description,
    generatedDescription: isGeneratedLegacyDescription({
      description: book.description,
      genre: book.genre,
      author: book.author,
    }),
    publicationDate: book.year,
    pages: book.pages,
    publishers: book.publisher ? [{ name: book.publisher }] : [],
    isbn: book.isbn,
    coverObjectKey: book.cover,
    rating: book.rating,
    ratingsCount: book.ratingsCount,
    catalogedAt: book.addedAt,
  }));
}

export function buildCatalogImportGraph(
  inputRecords: CatalogImportRecord[],
): CatalogImportGraph {
  const records = [...inputRecords].sort((left, right) =>
    left.recordKey.localeCompare(right.recordKey),
  );
  const graph: CatalogImportGraph = {
    metadataSources: sourcePolicies(),
    works: [],
    editions: [],
    authors: [],
    workAuthors: [],
    categories: [],
    workCategories: [],
    publishers: [],
    editionPublishers: [],
    languages: [],
    editionLanguages: [],
    editionIdentifiers: [],
    coverAssets: [],
    editionCovers: [],
    sourceRecords: [],
    sourceRecordLinks: [],
    fieldObservations: [],
    fieldResolutions: [],
    fieldResolutionHeads: [],
    entityAliases: [],
    catalogChangeEvents: [],
  };
  const seen = new Map<string, Set<string>>();
  const seenFor = (name: keyof CatalogImportGraph) => {
    const existing = seen.get(name);
    if (existing) return existing;
    const next = new Set<string>();
    seen.set(name, next);
    return next;
  };

  const addSourceRecord = (
    sourceKey: (typeof SOURCE_KEYS)[number],
    recordKey: string,
    payload: unknown,
    importerVersion: string | null,
  ) => {
    const id = sourceRecordId(sourceKey, recordKey);
    const payloadJson = canonicalJson(payload);
    pushUnique(graph.sourceRecords, seenFor("sourceRecords"), id, {
      id,
      sourceId: sourceId(sourceKey),
      recordKey,
      sourceRevision: importerVersion,
      sourceModifiedAt: null,
      retrievedAt: CATALOG_ARTIFACT_TIMESTAMP,
      payloadJson,
      payloadHash: hashCanonicalJson(payload),
      importerVersion,
      sourceRowHash: importerVersion ? hashCanonicalJson(payload) : null,
      state: "active",
    });
    return id;
  };

  const addLink = (
    recordId: string,
    entityType: CatalogEntityType,
    entityId: string,
    matchKind: "source_relationship" | "curated",
  ) => {
    const key = `${recordId}:${entityType}:${entityId}`;
    pushUnique(graph.sourceRecordLinks, seenFor("sourceRecordLinks"), key, {
      sourceRecordId: recordId,
      entityType,
      entityId,
      matchKind,
      mappingConfidence: 1,
      state: "active",
      actorRef: matchKind === "curated" ? "system:catalog-importer" : null,
      reason:
        matchKind === "curated" ? "Bukie-owned controlled vocabulary" : null,
      createdAt: CATALOG_ARTIFACT_TIMESTAMP,
    });
  };

  const addResolution = (input: {
    recordId: string;
    entityType: CatalogEntityType;
    entityId: string;
    fieldKey: CatalogFieldKey;
    value?: unknown;
    provenanceKind?: ProvenanceKind;
    observationState?: ObservationState;
    resolutionState?: ResolutionState;
    sourcePath?: string;
    actorRef?: string;
    reason?: string;
    derivation?: { name: string; version: string; parentIds: string[] };
    resolve?: boolean;
  }) => {
    const provenanceKind = input.provenanceKind ?? "imported";
    const observationState = input.observationState ?? "active";
    let observationId: string | null = null;
    if (input.value !== undefined) {
      const valueJson = canonicalJson(input.value);
      const comparisonHash = hashCanonicalJson(input.value);
      observationId = deterministicCatalogId(
        "field_observation",
        input.recordId,
        `${input.entityType}:${input.entityId}:${input.fieldKey}:${provenanceKind}:${comparisonHash}`,
      );
      pushUnique(
        graph.fieldObservations,
        seenFor("fieldObservations"),
        observationId,
        {
          id: observationId,
          sourceRecordId: input.recordId,
          entityType: input.entityType,
          entityId: input.entityId,
          fieldKey: input.fieldKey,
          valueJson,
          comparisonHash,
          provenanceKind,
          sourcePath: input.sourcePath ?? null,
          sourceModifiedAt: null,
          retrievedAt: CATALOG_ARTIFACT_TIMESTAMP,
          mappingConfidence: 1,
          state: observationState,
          actorRef: input.actorRef ?? null,
          reason: input.reason ?? null,
          derivationName: input.derivation?.name ?? null,
          derivationVersion: input.derivation?.version ?? null,
          parentIdsJson: input.derivation
            ? canonicalJson(input.derivation.parentIds)
            : null,
        },
      );
    }

    if (input.resolve === false) return observationId;
    const headKey = `${input.entityType}:${input.entityId}:${input.fieldKey}`;
    if (seenFor("fieldResolutionHeads").has(headKey)) return observationId;
    const state =
      input.resolutionState ??
      (observationId && observationState === "active" ? "present" : "missing");
    const selectedObservationId =
      state === "present" || state === "stale" ? observationId : null;
    const resolutionId = deterministicCatalogId(
      "field_resolution",
      CATALOG_RESOLVER_VERSION,
      `${input.entityType}:${input.entityId}:${input.fieldKey}:${state}:${selectedObservationId ?? "none"}`,
    );
    pushUnique(
      graph.fieldResolutions,
      seenFor("fieldResolutions"),
      resolutionId,
      {
        id: resolutionId,
        entityType: input.entityType,
        entityId: input.entityId,
        fieldKey: input.fieldKey,
        selectedObservationId,
        state,
        reason:
          input.reason ??
          (state === "present"
            ? "Selected approved active source observation"
            : "No eligible approved observation"),
        previousResolutionId: null,
        actorRef: "system:catalog-resolver",
        resolverVersion: CATALOG_RESOLVER_VERSION,
        resolvedAt: CATALOG_ARTIFACT_TIMESTAMP,
      },
    );
    pushUnique(
      graph.fieldResolutionHeads,
      seenFor("fieldResolutionHeads"),
      headKey,
      {
        entityType: input.entityType,
        entityId: input.entityId,
        fieldKey: input.fieldKey,
        resolutionId,
      },
    );
    return observationId;
  };

  const workEditions = new Map<string, string[]>();

  for (const record of records) {
    if (!record.recordKey.trim()) throw new Error("Record key is required");
    if (!record.title.trim()) {
      throw new Error(`Title is required for record ${record.recordKey}`);
    }
    const payload = {
      authors: record.authors,
      catalogedAt: record.catalogedAt ?? null,
      categories: record.categories,
      coverObjectKey: record.coverObjectKey ?? null,
      description: record.description ?? null,
      format: record.format ?? null,
      isbn: record.isbn ?? null,
      languages: record.languages ?? [],
      pages: record.pages ?? null,
      publicationDate: record.publicationDate ?? null,
      publishers: record.publishers ?? [],
      rating: record.rating ?? null,
      ratingsCount: record.ratingsCount ?? null,
      title: record.title,
    };
    const recordId = addSourceRecord(
      record.sourceKey,
      record.recordKey,
      payload,
      CATALOG_IMPORTER_VERSION,
    );
    const workRecordKey = record.workKey ?? record.recordKey;
    const workId = deterministicCatalogId(
      "work",
      record.sourceKey,
      workRecordKey,
    );
    const editionId = deterministicCatalogId(
      "edition",
      record.sourceKey,
      record.recordKey,
    );
    const workEditionIds = workEditions.get(workId) ?? [];
    workEditionIds.push(editionId);
    workEditions.set(workId, workEditionIds);

    pushUnique(graph.works, seenFor("works"), workId, {
      id: workId,
      preferredTitle: record.title.trim(),
      sortTitle: normalizeSortText(record.title),
      description:
        record.description && !record.generatedDescription
          ? record.description
          : null,
      firstPublicationDate: null,
      firstPublicationPrecision: null,
      firstPublicationSortDate: null,
      preferredEditionId: null,
      createdAt: CATALOG_ARTIFACT_TIMESTAMP,
      updatedAt: CATALOG_ARTIFACT_TIMESTAMP,
    });
    addLink(recordId, "work", workId, "source_relationship");
    addResolution({
      recordId,
      entityType: "work",
      entityId: workId,
      fieldKey: "work.preferred_title",
      value: record.title.trim(),
      sourcePath: "title",
    });

    if (record.description && record.generatedDescription) {
      addResolution({
        recordId,
        entityType: "work",
        entityId: workId,
        fieldKey: "work.description",
        value: record.description,
        provenanceKind: "synthetic",
        sourcePath: "description",
        resolutionState: "missing",
        reason:
          "Generated fallback description is not display-eligible evidence",
      });
    } else {
      addResolution({
        recordId,
        entityType: "work",
        entityId: workId,
        fieldKey: "work.description",
        value: record.description,
        sourcePath: "description",
      });
    }

    const partialDate =
      record.publicationDate === undefined
        ? null
        : parsePartialDate(record.publicationDate);
    const validPages =
      Number.isInteger(record.pages) && (record.pages ?? 0) > 0
        ? record.pages
        : null;
    pushUnique(graph.editions, seenFor("editions"), editionId, {
      id: editionId,
      workId,
      title: null,
      subtitle: null,
      format: record.format ?? null,
      publicationDate: partialDate?.value ?? null,
      publicationPrecision: partialDate?.precision ?? null,
      publicationSortDate: partialDate?.sortDate ?? null,
      pages: validPages,
      catalogedAt: record.catalogedAt ?? CATALOG_ARTIFACT_TIMESTAMP,
      createdAt: CATALOG_ARTIFACT_TIMESTAMP,
      updatedAt: CATALOG_ARTIFACT_TIMESTAMP,
    });
    addLink(recordId, "edition", editionId, "source_relationship");
    addResolution({
      recordId,
      entityType: "edition",
      entityId: editionId,
      fieldKey: "edition.title",
      sourcePath: "editionTitle",
    });
    addResolution({
      recordId,
      entityType: "edition",
      entityId: editionId,
      fieldKey: "edition.subtitle",
      sourcePath: "subtitle",
    });
    addResolution({
      recordId,
      entityType: "edition",
      entityId: editionId,
      fieldKey: "edition.format",
      value: record.format,
      sourcePath: "format",
    });
    addResolution({
      recordId,
      entityType: "edition",
      entityId: editionId,
      fieldKey: "edition.publication_date",
      value: partialDate
        ? { date: partialDate.value, precision: partialDate.precision }
        : undefined,
      sourcePath: "publicationDate",
    });
    addResolution({
      recordId,
      entityType: "edition",
      entityId: editionId,
      fieldKey: "edition.pages",
      value: validPages ?? undefined,
      sourcePath: "pages",
    });

    const authorValues: Array<{
      id: string;
      name: string;
      position: number;
      role: string;
    }> = [];
    for (const [position, author] of record.authors.entries()) {
      const name = author.name.trim();
      if (!name) continue;
      const authorKey = author.key ?? `${workRecordKey}:${position}`;
      const authorId = deterministicCatalogId(
        "author",
        record.sourceKey,
        authorKey,
      );
      pushUnique(graph.authors, seenFor("authors"), authorId, {
        id: authorId,
        displayName: name,
        sortName: normalizeSortText(name),
      });
      addLink(recordId, "author", authorId, "source_relationship");
      addResolution({
        recordId,
        entityType: "author",
        entityId: authorId,
        fieldKey: "author.display_name",
        value: name,
        sourcePath: `authors[${position}]`,
      });
      pushUnique(
        graph.workAuthors,
        seenFor("workAuthors"),
        `${workId}:${authorId}:${author.role ?? "author"}`,
        {
          workId,
          authorId,
          role: author.role ?? "author",
          position,
        },
      );
      authorValues.push({
        id: authorId,
        name,
        position,
        role: author.role ?? "author",
      });
    }
    addResolution({
      recordId,
      entityType: "work",
      entityId: workId,
      fieldKey: "work.authors",
      value: authorValues.length ? authorValues : undefined,
      sourcePath: "authors",
    });

    const categoryValues: Array<{
      id: string;
      slug: string;
      position: number;
      isPrimary: boolean;
    }> = [];
    for (const [position, category] of record.categories.entries()) {
      const label = category.label.trim();
      if (!label) continue;
      const slug = category.slug ?? slugifyCatalogValue(label);
      const categoryId = deterministicCatalogId(
        "category",
        "bukie_curated",
        slug,
      );
      const categoryRecordId = addSourceRecord(
        "bukie_curated",
        `category:${slug}`,
        { label, slug },
        null,
      );
      pushUnique(graph.categories, seenFor("categories"), categoryId, {
        id: categoryId,
        slug,
        label,
        status: "active",
      });
      addLink(categoryRecordId, "category", categoryId, "curated");
      addResolution({
        recordId: categoryRecordId,
        entityType: "category",
        entityId: categoryId,
        fieldKey: "category.label",
        value: label,
        provenanceKind: "curated",
        sourcePath: "label",
        actorRef: "system:catalog-importer",
        reason: "Bukie-owned controlled category vocabulary",
      });
      pushUnique(
        graph.workCategories,
        seenFor("workCategories"),
        `${workId}:${categoryId}`,
        {
          workId,
          categoryId,
          position,
          isPrimary:
            category.isPrimary ??
            (!record.categories.some((candidate) => candidate.isPrimary) &&
              position === 0),
        },
      );
      categoryValues.push({
        id: categoryId,
        slug,
        position,
        isPrimary:
          category.isPrimary ??
          (!record.categories.some((candidate) => candidate.isPrimary) &&
            position === 0),
      });
    }
    addResolution({
      recordId,
      entityType: "work",
      entityId: workId,
      fieldKey: "work.categories",
      value: categoryValues.length ? categoryValues : undefined,
      sourcePath: "categories",
    });

    const publisherValues: Array<Record<string, unknown>> = [];
    for (const [position, publisher] of (record.publishers ?? []).entries()) {
      const name = publisher.name.trim();
      if (!name) continue;
      const publisherId = deterministicCatalogId(
        "publisher",
        record.sourceKey,
        publisher.key ?? `${record.recordKey}:${position}`,
      );
      pushUnique(graph.publishers, seenFor("publishers"), publisherId, {
        id: publisherId,
        displayName: name,
      });
      addLink(recordId, "publisher", publisherId, "source_relationship");
      addResolution({
        recordId,
        entityType: "publisher",
        entityId: publisherId,
        fieldKey: "publisher.display_name",
        value: name,
        sourcePath: `publishers[${position}]`,
      });
      pushUnique(
        graph.editionPublishers,
        seenFor("editionPublishers"),
        `${editionId}:${publisherId}`,
        {
          editionId,
          publisherId,
          position,
          role: publisher.role ?? null,
        },
      );
      publisherValues.push({ id: publisherId, name, position });
    }
    addResolution({
      recordId,
      entityType: "edition",
      entityId: editionId,
      fieldKey: "edition.publishers",
      value: publisherValues.length ? publisherValues : undefined,
      sourcePath: "publishers",
    });

    const languageValues: Array<Record<string, unknown>> = [];
    for (const [position, language] of (record.languages ?? []).entries()) {
      const tag = language.tag.trim().toLowerCase();
      const label = language.label.trim();
      if (!tag || !label) continue;
      pushUnique(graph.languages, seenFor("languages"), tag, { tag, label });
      pushUnique(
        graph.editionLanguages,
        seenFor("editionLanguages"),
        `${editionId}:${tag}`,
        { editionId, languageTag: tag, position },
      );
      languageValues.push({ tag, label, position });
    }
    addResolution({
      recordId,
      entityType: "edition",
      entityId: editionId,
      fieldKey: "edition.languages",
      value: languageValues.length ? languageValues : undefined,
      sourcePath: "languages",
    });

    const validIsbn = normalizeValidIsbn(record.isbn);
    if (validIsbn) {
      const identifierId = deterministicCatalogId(
        "edition_identifier",
        record.sourceKey,
        `${record.recordKey}:${validIsbn.scheme}:${validIsbn.value}`,
      );
      pushUnique(
        graph.editionIdentifiers,
        seenFor("editionIdentifiers"),
        identifierId,
        {
          id: identifierId,
          editionId,
          scheme: validIsbn.scheme,
          valueNormalized: validIsbn.value,
          valueDisplay: record.isbn ?? validIsbn.value,
          isPrimary: true,
        },
      );
      addResolution({
        recordId,
        entityType: "edition",
        entityId: editionId,
        fieldKey: "edition.identifiers",
        value: [
          {
            id: identifierId,
            scheme: validIsbn.scheme,
            value: validIsbn.value,
            isPrimary: true,
          },
        ],
        sourcePath: "isbn",
      });
    } else if (record.isbn) {
      addResolution({
        recordId,
        entityType: "edition",
        entityId: editionId,
        fieldKey: "edition.identifiers",
        value: record.isbn,
        observationState: "invalid",
        resolutionState: "missing",
        sourcePath: "isbn",
        reason: "Invalid ISBN retained as evidence and not projected",
      });
    } else {
      addResolution({
        recordId,
        entityType: "edition",
        entityId: editionId,
        fieldKey: "edition.identifiers",
        sourcePath: "isbn",
      });
    }

    if (
      record.coverObjectKey &&
      isProviderNeutralCoverKey(record.coverObjectKey)
    ) {
      const coverId = deterministicCatalogId(
        "cover_asset",
        "object_key",
        record.coverObjectKey,
      );
      pushUnique(graph.coverAssets, seenFor("coverAssets"), coverId, {
        id: coverId,
        objectKey: record.coverObjectKey,
        mediaType: null,
        width: null,
        height: null,
        bytes: null,
        checksum: null,
        state: "available",
        sourcePolicyId: sourceId("legacy_catalog"),
      });
      addLink(recordId, "cover_asset", coverId, "source_relationship");
      addResolution({
        recordId,
        entityType: "cover_asset",
        entityId: coverId,
        fieldKey: "cover_asset.object_key",
        value: record.coverObjectKey,
        sourcePath: "coverObjectKey",
      });
      pushUnique(
        graph.editionCovers,
        seenFor("editionCovers"),
        `${editionId}:${coverId}`,
        { editionId, coverAssetId: coverId, position: 0, isPrimary: true },
      );
      addResolution({
        recordId,
        entityType: "edition",
        entityId: editionId,
        fieldKey: "edition.covers",
        value: [
          {
            id: coverId,
            objectKey: record.coverObjectKey,
            position: 0,
            isPrimary: true,
          },
        ],
        sourcePath: "coverObjectKey",
      });
    } else {
      addResolution({
        recordId,
        entityType: "edition",
        entityId: editionId,
        fieldKey: "edition.covers",
        value: record.coverObjectKey,
        observationState: record.coverObjectKey ? "invalid" : "active",
        resolutionState: "missing",
        sourcePath: "coverObjectKey",
        reason: record.coverObjectKey
          ? "Non-provider-neutral cover value was not projected"
          : "No cover observation supplied",
      });
    }

    if (record.rating !== undefined) {
      addResolution({
        recordId,
        entityType: "work",
        entityId: workId,
        fieldKey: "legacy.rating",
        value: record.rating,
        provenanceKind: "synthetic",
        sourcePath: "rating",
        resolve: false,
      });
    }
    if (record.ratingsCount !== undefined) {
      addResolution({
        recordId,
        entityType: "work",
        entityId: workId,
        fieldKey: "legacy.ratings_count",
        value: record.ratingsCount,
        provenanceKind: "synthetic",
        sourcePath: "ratingsCount",
        resolve: false,
      });
    }
  }

  for (const [workId, editionIds] of workEditions) {
    editionIds.sort();
    const preferredEditionId = editionIds[0];
    const work = graph.works.find((row) => row.id === workId);
    if (work) work.preferredEditionId = preferredEditionId;
    const derivationRecordKey = `preferred-edition:${workId}`;
    const derivationRecordId = addSourceRecord(
      "bukie_derivation",
      derivationRecordKey,
      { editionIds, selected: preferredEditionId, workId },
      CATALOG_RESOLVER_VERSION,
    );
    addLink(derivationRecordId, "work", workId, "source_relationship");
    addResolution({
      recordId: derivationRecordId,
      entityType: "work",
      entityId: workId,
      fieldKey: "work.preferred_edition",
      value: preferredEditionId,
      provenanceKind: "derived",
      actorRef: "system:catalog-resolver",
      reason: "Lowest deterministic edition UUID selected",
      derivation: {
        name: "preferred-edition",
        version: CATALOG_RESOLVER_VERSION,
        parentIds: [],
      },
    });
  }

  for (const key of Object.keys(graph) as Array<keyof CatalogImportGraph>) {
    graph[key].sort((left, right) =>
      canonicalJson(left).localeCompare(canonicalJson(right)),
    );
  }
  validateCatalogImportGraph(graph);
  return graph;
}

export function catalogGraphCounts(graph: CatalogImportGraph) {
  return Object.fromEntries(
    Object.entries(graph).map(([name, rows]) => [name, rows.length]),
  );
}
