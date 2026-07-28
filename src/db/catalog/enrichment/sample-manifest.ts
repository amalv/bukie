import { deterministicCatalogId } from "../identity";
import type { EnrichmentSampleManifest, SampleWork } from "./types";

export const ENRICHMENT_SAMPLE_MANIFEST = {
  id: "bukie-enrichment-diagnostic-five",
  version: "2026-07-28.v1",
  reviewedAt: "2026-07-28",
  works: [
    {
      workId: "7adeda04-34e2-5a7d-a101-de0578138b29",
      legacyRecordKey: "c44b0f05-536d-4ce2-a6d5-75a2614ec119",
      title: "Dune",
      orderedCreators: ["Frank Herbert"],
      providerRelations: { wikidata: "Q190192" },
      exactIdentifiers: ["isbn13:9780441172719"],
    },
    {
      workId: "00a218bd-3005-59cd-9c23-13efb48abe5a",
      legacyRecordKey: "a8f901a5-6b85-500d-910a-5c47d0c3971a",
      title: "Moby-Dick",
      orderedCreators: ["Herman Melville"],
      providerRelations: { wikidata: "Q174596" },
      exactIdentifiers: [],
    },
    {
      workId: "00a01d7f-3f29-5c95-a292-c70a4e5dbb4f",
      legacyRecordKey: "cd0586eb-7932-4bbe-b596-83ae57d45020",
      title: "The City and the Stars",
      orderedCreators: ["Arthur C. Clarke"],
      providerRelations: { wikidata: "Q386544" },
      exactIdentifiers: [],
    },
    {
      workId: "03ac5ae7-dcf1-5fe7-b6ac-b8f171459fb3",
      legacyRecordKey: "09004e91-66f4-5e15-bb04-2a67e8602509",
      title: "Born a Crime",
      orderedCreators: ["Trevor Noah"],
      providerRelations: { wikidata: "Q29831237" },
      exactIdentifiers: [],
    },
    {
      workId: "0100088c-3aca-5e52-9e7a-fb89192e9248",
      legacyRecordKey: "408ab9ec-43d5-5845-a94d-ccc63eb10ee4",
      title: "Faithful Place",
      orderedCreators: ["Tana French"],
      providerRelations: { wikidata: "Q5431286" },
      exactIdentifiers: [],
    },
  ],
} as const satisfies EnrichmentSampleManifest;

const sampleById = new Map<string, SampleWork>(
  ENRICHMENT_SAMPLE_MANIFEST.works.map((work) => [work.workId, work]),
);

export function getSampleWork(workId: string): SampleWork {
  const work = sampleById.get(workId);
  if (!work) {
    throw new Error(
      `Enrichment scope refused: work ${workId} is outside ${ENRICHMENT_SAMPLE_MANIFEST.id}@${ENRICHMENT_SAMPLE_MANIFEST.version}`,
    );
  }
  return work;
}

export function assertSampleScope(workIds: readonly string[]): SampleWork[] {
  if (workIds.length === 0) {
    throw new Error(
      "Enrichment scope refused: at least one work ID is required",
    );
  }
  if (new Set(workIds).size !== workIds.length) {
    throw new Error(
      "Enrichment scope refused: duplicate work IDs are not allowed",
    );
  }
  return [...workIds].sort().map(getSampleWork);
}

for (const work of ENRICHMENT_SAMPLE_MANIFEST.works) {
  const derived = deterministicCatalogId(
    "work",
    "legacy_catalog",
    work.legacyRecordKey,
  );
  if (derived !== work.workId) {
    throw new Error(
      `Enrichment sample manifest is inconsistent for ${work.title}`,
    );
  }
}
