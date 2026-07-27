# Catalog artifacts

`artifacts/catalog` is the pinned typed input for the deterministic normalized
catalog import. `index.ts` combines the curated category files, while
`types.ts` defines the frozen `legacy_catalog` evidence shape.

The artifact is not a runtime database contract. Product reads use
`WorkSummary` and `WorkDetail` projected from the normalized schema.
