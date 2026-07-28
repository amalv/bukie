import type { CatalogImportRecord } from "../importer";
import { ENRICHMENT_SAMPLE_MANIFEST } from "./sample-manifest";
import type { ProviderRecord } from "./types";

export const SAMPLE_BASELINE_IMPORT_RECORDS: CatalogImportRecord[] =
  ENRICHMENT_SAMPLE_MANIFEST.works.map((work) => ({
    sourceKey: "legacy_catalog",
    recordKey: work.legacyRecordKey,
    title: work.title,
    authors: work.orderedCreators.map((name) => ({ name })),
    categories: [],
    isbn:
      work.exactIdentifiers
        .find((identifier) => identifier.startsWith("isbn13:"))
        ?.slice("isbn13:".length) ?? undefined,
  }));

const RETRIEVED_AT = Date.UTC(2026, 6, 28, 12, 0, 0);

export const SAMPLE_PROVIDER_RECORDS: ProviderRecord[] =
  ENRICHMENT_SAMPLE_MANIFEST.works.flatMap((work, index) => {
    const wikidataId = work.providerRelations.wikidata;
    const editorial: ProviderRecord = {
      adapterId: "bukie.editorial",
      recordKey: `editorial:${work.workId}`,
      sourceRevision: "diagnostic-five-editorial-v1",
      retrievedAt: RETRIEVED_AT,
      targetWorkId: work.workId,
      title: work.title,
      orderedCreators: work.orderedCreators,
      evidence: [
        {
          fieldClass: "metadata",
          fieldKey: "work.preferred_title",
          value: work.title,
          sourcePath: "title",
          provenanceKind: "curated",
          actorRef: "system:diagnostic-five-fixture",
          reason: "Bukie-owned diagnostic evidence fixture",
        },
      ],
      acquisition: {
        successful: true,
        cacheHit: true,
        latencyMs: 0,
        retries: 0,
        status: 200,
        responseBytes: 0,
      },
    };
    const wikidata: ProviderRecord = {
      adapterId: "wikidata.work-facts",
      recordKey: wikidataId,
      sourceRevision: `recorded-search-2026-07-28:${wikidataId}`,
      retrievedAt: RETRIEVED_AT + index,
      targetWorkId: work.workId,
      title: work.title,
      orderedCreators: work.orderedCreators,
      providerWorkId: wikidataId,
      identityConflicts:
        work.title === "Dune"
          ? ["same-title adaptations and series appeared ahead of the novel"]
          : undefined,
      evidence: [
        {
          fieldClass: "metadata",
          fieldKey: "work.preferred_title",
          value: work.title,
          sourcePath: "labels.en.value",
          provenanceKind: "imported",
        },
      ],
      rawPayload: {
        id: wikidataId,
        label: work.title,
        recordedFixture: true,
      },
      acquisition: {
        successful: true,
        cacheHit: false,
        conditionalHit: false,
        latencyMs: 20 + index,
        retries: 0,
        status: 200,
        responseBytes: 100 + index,
      },
    };
    return [editorial, wikidata];
  });
