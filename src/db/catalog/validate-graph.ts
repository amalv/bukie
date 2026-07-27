import type { CatalogImportGraph } from "./importer";

function requireInvariant(
  condition: unknown,
  message: string,
): asserts condition {
  if (!condition) throw new Error(`Catalog graph invariant failed: ${message}`);
}

export function validateCatalogImportGraph(graph: CatalogImportGraph): void {
  const entityIds = {
    work: new Set(graph.works.map((row) => row.id)),
    edition: new Set(graph.editions.map((row) => row.id)),
    author: new Set(graph.authors.map((row) => row.id)),
    category: new Set(graph.categories.map((row) => row.id)),
    publisher: new Set(graph.publishers.map((row) => row.id)),
    cover_asset: new Set(graph.coverAssets.map((row) => row.id)),
  };
  const sourceIds = new Set(graph.metadataSources.map((row) => row.id));
  const sourceRecords = new Map(
    graph.sourceRecords.map((row) => [row.id, row]),
  );
  for (const record of graph.sourceRecords) {
    requireInvariant(
      sourceIds.has(record.sourceId),
      `source record ${String(record.id)} references a missing source`,
    );
  }

  const activeLinks = new Set<string>();
  for (const link of graph.sourceRecordLinks) {
    const entityType = link.entityType as keyof typeof entityIds;
    requireInvariant(
      sourceRecords.has(link.sourceRecordId),
      `link references missing source record ${String(link.sourceRecordId)}`,
    );
    requireInvariant(
      entityType in entityIds && entityIds[entityType].has(link.entityId),
      `link references missing ${String(link.entityType)} ${String(link.entityId)}`,
    );
    if (link.matchKind === "curated" || link.state === "rejected") {
      requireInvariant(
        Boolean(String(link.actorRef ?? "").trim()) &&
          Boolean(String(link.reason ?? "").trim()),
        "curated and rejected links require actor and reason",
      );
    }
    if (link.state === "active") {
      activeLinks.add(
        `${link.sourceRecordId}:${link.entityType}:${link.entityId}`,
      );
    }
  }

  const observations = new Map(
    graph.fieldObservations.map((row) => [row.id, row]),
  );
  for (const observation of graph.fieldObservations) {
    requireInvariant(
      activeLinks.has(
        `${observation.sourceRecordId}:${observation.entityType}:${observation.entityId}`,
      ),
      `observation ${String(observation.id)} lacks an active entity link`,
    );
    if (observation.provenanceKind === "curated") {
      requireInvariant(
        Boolean(String(observation.actorRef ?? "").trim()) &&
          Boolean(String(observation.reason ?? "").trim()),
        `curated observation ${String(observation.id)} lacks actor or reason`,
      );
    }
    if (observation.provenanceKind === "derived") {
      requireInvariant(
        Boolean(String(observation.derivationName ?? "").trim()) &&
          Boolean(String(observation.derivationVersion ?? "").trim()) &&
          observation.parentIdsJson !== null,
        `derived observation ${String(observation.id)} lacks derivation metadata`,
      );
    }
  }

  const resolutions = new Map(
    graph.fieldResolutions.map((row) => [row.id, row]),
  );
  for (const resolution of graph.fieldResolutions) {
    if (resolution.selectedObservationId) {
      const selected = observations.get(resolution.selectedObservationId);
      requireInvariant(
        selected &&
          selected.entityType === resolution.entityType &&
          selected.entityId === resolution.entityId &&
          selected.fieldKey === resolution.fieldKey,
        `resolution ${String(resolution.id)} selects mismatched evidence`,
      );
      requireInvariant(
        !(
          selected.provenanceKind === "synthetic" &&
          !String(resolution.fieldKey).startsWith("legacy.")
        ),
        `resolution ${String(resolution.id)} selects synthetic bibliography`,
      );
    }
    if (resolution.previousResolutionId) {
      const previous = resolutions.get(resolution.previousResolutionId);
      requireInvariant(
        previous &&
          previous.entityType === resolution.entityType &&
          previous.entityId === resolution.entityId &&
          previous.fieldKey === resolution.fieldKey,
        `resolution ${String(resolution.id)} has a mismatched predecessor`,
      );
    }
  }
  for (const head of graph.fieldResolutionHeads) {
    const resolution = resolutions.get(head.resolutionId);
    requireInvariant(
      resolution &&
        resolution.entityType === head.entityType &&
        resolution.entityId === head.entityId &&
        resolution.fieldKey === head.fieldKey,
      `resolution head ${String(head.entityType)}:${String(head.entityId)}:${String(head.fieldKey)} is mismatched`,
    );
  }

  const editions = new Map(graph.editions.map((row) => [row.id, row]));
  for (const work of graph.works) {
    if (!work.preferredEditionId) continue;
    requireInvariant(
      editions.get(work.preferredEditionId)?.workId === work.id,
      `work ${String(work.id)} prefers an edition belonging to another work`,
    );
  }

  for (const [name, rows, ownerKey] of [
    ["work category", graph.workCategories, "workId"],
    ["edition cover", graph.editionCovers, "editionId"],
    ["edition identifier", graph.editionIdentifiers, "editionId"],
  ] as const) {
    const primaryCounts = new Map<unknown, number>();
    for (const row of rows) {
      if (!row.isPrimary) continue;
      primaryCounts.set(
        row[ownerKey],
        (primaryCounts.get(row[ownerKey]) ?? 0) + 1,
      );
    }
    requireInvariant(
      [...primaryCounts.values()].every((count) => count <= 1),
      `${name} has more than one primary relationship`,
    );
  }
}
