# Normalized Catalog Rebuild

This document covers the first implementation slice of
[ADR 0016](./decisions/0016-catalog-metadata-provenance.md): creating and
rebuilding the normalized catalog on a disposable SQLite or explicitly isolated
Postgres target. The application runtime now reads the normalized work-first
model; this command remains a destructive rehearsal tool for disposable
targets only.

## Safety boundary

Every catalog rebuild is destructive for the normalized tables in the selected
target. The command:

- requires an explicit `--target`;
- requires `--confirm-disposable`;
- resolves and prints the exact target before opening it;
- refuses all targets when a production environment marker is active;
- refuses `.data/dev.sqlite`;
- permits SQLite files only below `.data/catalog-targets` or the operating
  system temporary directory;
- refuses active application Postgres URLs, production-like names and
  Postgres targets that do not identify an isolated test, preview, branch,
  local or disposable database;
- has no production override;
- clears only the 21 normalized target tables inside the import transaction;
- never clears, drops or writes `books` or `book_metrics`.

Do not point this tooling at a production credential. A Postgres test run must
use a dedicated database supplied through `CATALOG_TEST_POSTGRES_URL`; do not
reuse `DATABASE_URL`, `POSTGRES_URL` or a production branch.

## Local SQLite rebuild

Create a disposable target below the approved directory:

```powershell
bun run db:catalog:rebuild --target=sqlite:.data/catalog-targets/catalog-test.sqlite --confirm-disposable
```

The first run applies migrations to the disposable file. A rebuild then clears
only normalized tables and imports all rows in one transaction. If parsing,
validation, projection or insertion fails, the transaction rolls back rather
than leaving a partial catalog.

To exercise rollback deliberately on a disposable target:

```powershell
bun run db:catalog:rebuild --target=sqlite:.data/catalog-targets/catalog-failure-test.sqlite --confirm-disposable --fail-after-table=editions
```

The command must fail. Integration tests verify that a prior complete target
snapshot remains unchanged after this forced failure.

## Isolated Postgres rebuild

Set a dedicated test or preview-branch URL. Its host or database name must make
the isolation explicit:

```powershell
$env:CATALOG_TEST_POSTGRES_URL = "<dedicated isolated test URL>"
bun run db:catalog:rebuild "--target=postgres:$env:CATALOG_TEST_POSTGRES_URL" --confirm-disposable
```

The safety validator redacts credentials when describing the target. The
Postgres integration test is skipped unless `CATALOG_TEST_POSTGRES_URL` is set:

```powershell
bunx vitest --config vitest.config.unit.ts --run src/db/catalog/postgres-rebuild.test.ts
```

No existing local environment file is assumed to be disposable.

## Deterministic contract

The rebuild freezes these inputs and algorithms:

- the 500 typed records exported by `artifacts/catalog/index.ts`;
- the fixed Bukie UUIDv5 namespace in `src/db/catalog/identity.ts`;
- `legacy-catalog-v1` as the importer version;
- `catalog-resolver-v1` as the resolver version;
- canonical JSON with recursively sorted object keys;
- SHA-256 source-row and comparison hashes;
- the accepted ADR timestamp for imported retrieval and resolution events;
- one work and one edition per legacy row unless a structured `workKey`
  supplies explicit grouping evidence;
- provider-neutral cover object keys independent of work and edition IDs.

The current baseline reconciles to:

| Target entity or event | Count |
| --- | ---: |
| Works | 500 |
| Editions | 500 |
| Ordered author credits | 507 |
| Categories | 5 |
| Cover assets / edition covers | 500 / 500 |
| Valid edition identifiers | 3 |
| Source records | 1,005 |
| Source-record links | 2,512 |
| Field observations | 4,915 |
| Resolution events / heads | 8,012 / 8,012 |

Two clean SQLite rebuilds produced the same complete target snapshot hash:

```text
a03e35558b7a48219aa5b170f7d179cc64ba86bbb5105c7fe97f6a87d0bd3acf
```

The automated test compares complete table snapshots rather than depending on
this documentation value alone.

## Provenance behavior

The rebuild registers three approved internal policies:

- `legacy_catalog` for retained selected fields and reusable provider-neutral
  cover keys;
- `bukie_curated` for Bukie-owned controlled vocabulary;
- `bukie_derivation` for deterministic preferred-edition selection.

Every projected imported value has an active source-record link, immutable
observation and current resolution head. Missing values receive explicit
`missing` resolutions without empty strings, zeroes or fabricated facts.
Invalid ISBN and cover values remain non-projectable evidence.

The 400 generated descriptions are stored as synthetic observations and
resolve `work.description` to `missing`. The 400 generated rating/count pairs
are retained as synthetic audit observations under `legacy.rating` and
`legacy.ratings_count`; they have no resolution heads and no catalog
projection.

Representative fixtures live in `src/db/catalog/fixtures.ts`. Their 14 edition
inputs resolve to 13 works and cover ordered multiple authors/categories,
verified multi-edition grouping, missing identifiers and metadata, compatible
and conflicting partial dates, stale and withdrawn evidence, uncertain
same-title matches, reusable covers and synthetic fallback fields.

## Validation

Run:

```powershell
bun run lint
bun run test
bun run build:ci
git diff --check
```

The unit suite includes:

- deterministic UUIDv5, canonical hashing, ISBN and partial-date behavior;
- source lifecycle, precedence, conflicts and synthetic exclusions;
- SQLite/Postgres logical schema and migration parity;
- SQLite empty creation, two clean rebuilds, retry idempotency and constraints;
- forced failure rollback and production-target refusal;
- a gated live Postgres rebuild/parity test for an explicitly isolated URL.

## Runtime cutover and rollout

Repository, API, SSR, search, pagination, and detail reads use the normalized
work-first contract. Forward migrations remove the old runtime tables only
after validating populated old rows against active `legacy_catalog` work and
edition evidence.

Before applying those migrations outside disposable tests:

1. Run the pinned artifact against an isolated Postgres preview branch.
2. Compare complete snapshots, counts, repository projections, API responses,
   query plans, and cover responses with disposable SQLite.
3. Verify preview SSR, homepage search/pagination, and canonical work routes.
4. Retain the prior export, database, and deployment for rollback.
5. Obtain explicit approval for the production application/database cutover.
