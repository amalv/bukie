# Catalog enrichment promotion proposal

- Status: issue #143 repository-input and PoC cover slice implemented
- Dry-run input: `bukie-catalog-enrichment-dry-run@2026-07-29.v1`
- Related issues: #135 and #143
- Production database execution: not approved

Issue #143 contains exactly four reviewed
`work.first_publication_date` proposals:

- Moby-Dick: 1851
- The City and the Stars: 1956
- Born a Crime: 2016
- Faithful Place: 2010

Dune's first-publication evidence remains unresolved because the recorded
Wikidata identity is ambiguous. No preferred-title or description proposal is
included, and description queue overflow remains paused.

The date approval `github-issue-143-reviewed-slice-v1` pins report SHA-256
`a85538c057e0b65696644e372f09f18a6da0daf0cefec0d42d641ee4ca6a1b0d`,
manifest content hash
`7b7cc856a2c8e8a9aff35098491df49d8cce85c6a7f7639a0c4cecd25fcfa615`,
run content hash
`9b8e04b5cb005181b40e61b0185ed5a5d6b5d9eed902527b891e4d058baad5bd`,
and the exact four proposal IDs in
`src/db/catalog/enrichment/diagnostic-five-promotion.ts`.

## PoC cover decision

The owner explicitly accepted deferred cover display rights for the PoC.
Rights are not represented as cleared and become mandatory before definitive
production launch. This exception applies only to covers.

The cover approval `github-issue-143-poc-cover-slice-v1` pins manifest hash
`9a8befefb07fe9b112c46cbacedab3d279bc0aa117019e4e63e3cef5b20cadd1`
and an exact five-proposal allow-list. Each proposal records:

- strong work- or edition-level identity without conflating the scopes;
- an allow-listed provider and stable provider-native page/asset identifier;
- retrieval time plus original and normalized content hashes;
- media type, dimensions, bytes, aspect ratio, inspection flags, and score;
- reviewer, decision reason, and acknowledged warnings;
- `rightsStatus: deferred_poc`, `rightsCleared: false`, issue #143, and
  mandatory launch re-review; and
- immutable predecessor history plus deterministic withdrawal, purge, and
  rollback data.

Dune is edition-scoped to ISBN-13 `9780441172719` through Open Library edition
`OL7525230M`. Moby-Dick, The City and the Stars, Born a Crime, and Faithful
Place are work-scoped using reviewed Standard Ebooks or official publisher
relations. They are not attached to Bukie's selected editions.

The PoC source allow-list is limited to the exact recorded Open Library,
Standard Ebooks/GitHub, Hachette, and Penguin Random House hosts. Image search
results, retailer pages, runtime provider fetching, unversioned overwrites,
and live scraping are not permitted.

## Transaction boundary

The transaction accepts only the byte-stable #135 report, the exact date and
cover approval IDs, and both complete proposal allow-lists. In one transaction
it:

1. locks affected work and current-head rows;
2. revalidates source policy, retained record revision, work/edition identity,
   attribution, withdrawal, decode/quality inspection, review decision, and
   current projection eligibility;
3. refuses all writes if any approved input or current eligibility drifts;
4. appends immutable date resolutions and cover decision/projection histories;
5. advances only the approved date and cover heads;
6. confirms unrelated descriptions, preferred editions, legacy cover
   relations, and resolution heads are unchanged; and
7. returns a deterministic public-output hash.

Retry is idempotent. SQLite and PostgreSQL use the same logical rows and IDs.
Clean rebuilds include the same reviewed evidence and histories, while #135
explicitly requests the pre-promotion graph to keep its report byte-stable.

## Public projection

Reader queries load a selected cover from the work-level projection head and
reapply current source approval, asset-display policy, decision state, asset
availability, and withdrawal state. The projection exposes identity scope and
deferred-rights status. A work-scoped cover is a work fallback and is never
silently inserted into `edition_covers`.

The four approved dates remain work-level first-publication facts, separate
from preferred-edition publication dates. Dune's date remains missing.

## Rollback

Rollback appends new missing date resolutions and placeholder cover
projections whose predecessors are the promoted heads. It never deletes
observations, candidates, inspections, reviews, assets, or prior projections.
Withdrawn or ineligible evidence is never resurrected. A repeated rollback is
idempotent, and an injected failure rolls back the complete transaction.

The five R2 objects use immutable issue-namespaced keys. Withdrawal can advance
the public head to the placeholder and execute the existing policy-required
purge callback without rewriting history.

## Preview and production authorization

The five reviewed WebP objects were uploaded explicitly to private R2 after
confirming their keys did not already exist. Builds remain read-only.

Existing-database promotion is permitted only when Vercel reports PR #144,
`VERCEL_ENV=preview`, the exact feature branch and deployment ID, and a
distinct matching Neon branch/host. The 2026-07-29 operational check found
that the branch-specific Preview variables and existing production
configuration used the same Neon endpoint and that the deployment exposed no
`NEON_BRANCH_ID`. The write therefore failed closed and was not executed.

No production database execution is authorized. Passing CI, merging code,
deploying Vercel, or uploading R2 assets must not be interpreted as database
promotion approval.
