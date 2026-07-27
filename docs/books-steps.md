# Catalog curation and deterministic import

The typed files in `artifacts/catalog` are the pinned `legacy_catalog` input for
the normalized importer. They are import evidence, not the application domain
or a table-shaped seed contract.

## Local workflow

1. Curate the appropriate category artifact.
2. Run `bun run db:catalog:rebuild` against a disposable target as documented
   in [catalog-rebuild.md](./catalog-rebuild.md).
3. Review importer counts, invalid fields, cover keys, and representative work
   projections.
4. Run the normalized repository/API tests and focused Playwright coverage.
5. Use `bun run db:init` only for the normal idempotent local runtime setup.

Do not directly insert or update projected work/edition fields. Future metadata
changes must enter through approved source records, immutable observations, and
versioned resolutions.

Cover tooling reads the artifact and manages provider-neutral `/covers/...`
objects. It does not mutate runtime catalog rows.
