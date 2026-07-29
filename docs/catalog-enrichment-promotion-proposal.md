# Catalog enrichment promotion proposal

- Status: issue #143 repository-input slice implemented; production database
  execution remains unapproved
- Dry-run input: `bukie-catalog-enrichment-dry-run@2026-07-29.v1`
- Related issues: #135 and #143

Issue #143 implements the first deliberately narrow repository-input slice
from this proposal. It does not authorize or execute an update against a
production database. The approved slice contains exactly four
`work.first_publication_date` proposals:

- Moby-Dick: 1851
- The City and the Stars: 1956
- Born a Crime: 2016
- Faithful Place: 2010

Dune remains unresolved because its recorded Wikidata identity evidence is
ambiguous. No preferred-title, description, or cover proposal is included.
The description queue-overflow cases remain paused, and no cover has both the
required strong identity and display-rights evidence.

The repository approval record is
`github-issue-143-reviewed-slice-v1`. It pins report SHA-256
`a85538c057e0b65696644e372f09f18a6da0daf0cefec0d42d641ee4ca6a1b0d`,
manifest content hash
`7b7cc856a2c8e8a9aff35098491df49d8cce85c6a7f7639a0c4cecd25fcfa615`,
run content hash
`9b8e04b5cb005181b40e61b0185ed5a5d6b5d9eed902527b891e4d058baad5bd`,
and the exact four proposal IDs in
`src/db/catalog/enrichment/diagnostic-five-promotion.ts`.

## Required review and approval

Promotion must remain unavailable until all of the following are true:

1. A byte-stable report and its immutable manifest are retained and the input,
   source-snapshot, policy, adapter, importer, matcher, resolver, gate, and
   inspection hashes still match.
2. Every selected source policy is currently approved for the exact retained
   metadata, text, or asset field. Adapter availability alone is not approval.
3. Identity conflicts, rights blocks, withdrawals, policy failures, and queue
   overflow are unresolved rather than selected.
4. Human-review staffing and a queue cap are approved. Every candidate class
   that requires review has a completed, independent decision.
5. Proposed coverage, direct cost, runtime, and review volume have been
   accepted despite any material variance from the #130 planning envelope.
6. SQLite/PostgreSQL logical parity, schema no-diff, deterministic reruns,
   isolation checks, and rollback rehearsal pass for the exact manifest.
7. A catalog data steward and a repository maintainer give explicit recorded
   approval for the exact manifest content hash and proposed-resolution set.
   Neither approval may be inferred from a merged adapter, passing CI, or the
   existence of this document.

For issue #143, the checked-in repository input is reviewable in the normal PR
boundary. Running the existing-database transaction against production remains
separately unavailable because
`productionDatabaseExecutionApproved` is explicitly `false`. Passing tests,
merging adapter code, or deploying the application must not be interpreted as
that operational approval.

## Proposed transaction boundary

The issue #143 transaction accepts only the exact approved manifest/report and
the exact allow-list of reviewed proposal IDs. In one database transaction it:

1. locks the affected resolution heads and work projection rows;
2. re-evaluate current source, record, link, observation, identity, rights,
   withdrawal, model/prompt, policy, and review eligibility;
3. refuse the complete transaction if any approved input drifted, any selected
   observation became ineligible, or any proposal is outside the manifest;
4. append immutable resolution events whose `previous_resolution_id` retains
   every prior head;
5. updates only the explicitly approved current heads and their matching
   projections;
6. refuses every description and asset path because neither class has an
   approved proposal in this slice.

No observation, prior resolution, review decision, or projection-history event
would be deleted. Description and cover changes would remain field-specific;
one approved field would not authorize another.

Deterministic clean rebuilds consume the same approved four-observation input,
so a reviewed repository state cannot silently lose the facts on rebuild.
Existing-database execution is a separate operational boundary and still
requires a new recorded production approval.

## Rollback proposal

Rollback would require an explicit approval referencing the promotion event.
In one transaction it would:

1. lock the same affected heads and projections;
2. verify each retained prior observation is still policy- and
   withdrawal-eligible;
3. append rollback resolution events pointing to the retained prior
   observations;
4. move current heads and field projections to those appended rollback events;
5. restore only eligible prior asset pointers, otherwise select the safe
   placeholder;
6. append a rollback catalog event linked to the promotion event; and
7. verify the expected public-output hashes before restoring the retained
   application deployment.

If a prior observation or asset is no longer eligible, rollback must fail
closed for that field and use an explicit missing/placeholder resolution. It
must never resurrect withdrawn evidence, bypass a purge requirement, rewrite
history, or copy a prior value directly into a public projection.

## Explicit non-authorization

Issue #143 authorizes only the checked-in deterministic repository input and
its disposable-target transaction verification. It does not authorize a
production database execution. The #135 report by itself is not an approval;
the exact issue #143 approval ID and four-ID allow-list are also required.
