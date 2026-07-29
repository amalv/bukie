# Catalog enrichment promotion proposal

- Status: proposal only; not approved or executable
- Dry-run input: `bukie-catalog-enrichment-dry-run@2026-07-29.v1`
- Related issue: #135

This document describes a possible future promotion boundary for maintainers
to review. Issue #135 does not implement, expose, or execute this operation.
The recorded #135 run is not promotion-ready: it intentionally has 495 works
without approved retained snapshots, two paused queue-overflow cases, one
ambiguous identity case, and no eligible cover or description candidates.

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

## Proposed transaction boundary

A future implementation should accept only an explicitly approved manifest and
an exact allow-list of reviewed proposal IDs. In one database transaction it
would:

1. lock the affected resolution heads and relevant work/edition projection
   rows;
2. re-evaluate current source, record, link, observation, identity, rights,
   withdrawal, model/prompt, policy, and review eligibility;
3. refuse the complete transaction if any approved input drifted, any selected
   observation became ineligible, or any proposal is outside the manifest;
4. append immutable resolution events whose `previous_resolution_id` retains
   every prior head;
5. update only the explicitly approved current heads and their matching
   projections;
6. update an asset pointer only after the exact approved asset checksum is
   durably available and its display policy still permits it; and
7. append a catalog change event containing the manifest hash, approval
   references, prior-head set, new-head set, and deployment correlation ID.

No observation, prior resolution, review decision, or projection-history event
would be deleted. Description and cover changes would remain field-specific;
one approved field would not authorize another.

Application deployment is a separate boundary. The matching reader deployment
would occur only after the database transaction commits and its post-commit
public-output hashes are reviewed. The previous application deployment and
database head set must remain retained until the observation window closes.

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

This proposal does not authorize a production, preview, reader-facing, or
public-output change. A future tracked issue and separately reviewed PR are
required to implement any promotion command. The #135 report must not be used
as its approval because its purpose is to prove isolation and expose omissions,
not to maximize or publish coverage.
