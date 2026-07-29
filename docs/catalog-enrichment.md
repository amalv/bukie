# Policy-gated catalog enrichment

Issue #131 adds a provider-neutral adapter foundation on top of ADR 0016's
existing source-record, link, observation, resolution, and eligibility
lifecycle. It does not add another catalog data system and does not promote
enrichment into current resolution heads or reader-facing projections.

## Execution boundary

Executable enrichment is restricted by
`src/db/catalog/enrichment/sample-manifest.ts` to the versioned
`bukie-enrichment-diagnostic-five@2026-07-28.v1` manifest:

| Work | Work ID | Recorded Wikidata work candidate |
|---|---|---|
| Dune | `7adeda04-34e2-5a7d-a101-de0578138b29` | `Q190192` |
| Moby-Dick | `00a218bd-3005-59cd-9c23-13efb48abe5a` | `Q174596` |
| The City and the Stars | `00a01d7f-3f29-5c95-a292-c70a4e5dbb4f` | `Q386544` |
| Born a Crime | `03ac5ae7-dcf1-5fe7-b6ac-b8f171459fb3` | `Q29831237` |
| Faithful Place | `0100088c-3aca-5e52-9e7a-fb89192e9248` | `Q5431286` |

The manifest records sample identity evidence; adapters, policies, matchers,
normalizers, and acquisition code contain no sample-specific branches.
Requests outside the manifest fail before acquisition or persistence. The
diagnostic workflow builds its five baseline work rows directly from this
manifest and never loads or scans the 500-work artifact.

The enrichment engine receives its versioned scope manifest as an input rather
than importing the diagnostic fixture. The issue #131 command is the only
executable entry point and always supplies the five-work manifest. A future
catalog runner can supply reviewed, checkpointed batch manifests without
changing adapter, matching, normalization, or persistence behavior; that
catalog-wide execution remains part of #135.

Catalog-wide dry run and promotion remain deferred to #135.

## Adapter and policy contract

Every adapter declares stable source and adapter IDs, adapter and source-policy
versions, separate metadata/text/asset permissions, acquisition method,
attribution, caching, payload retention, transformation, withdrawal and purge
behavior, credentials, concurrency, request interval, retry ceiling,
exponential backoff, jitter, `Retry-After`, conditional retrieval, revision
identity, approval state, disabled reason, and review date.

The shared acquisition layer:

- limits each host to its declared concurrency and minimum request interval;
- uses injected transports, clocks, sleeps, random values, and caches so tests
  never call a live provider;
- distinguishes terminal 4xx responses from retryable 408, 429, and 5xx
  responses;
- honors `Retry-After` and otherwise applies bounded exponential backoff and
  jitter;
- supports ETag/Last-Modified conditional retrieval and snapshot caches;
- fails closed on missing credentials or an exhausted retry ceiling; and
- redacts authorization, cookie, credential, password, secret, token, and API
  key material from diagnostics.

Raw payloads are retained only when the field-class permission allows `full`
retention. `selected_fields` stores the normalized selected evidence, while
`none` stores no payload. A supplied raw payload under a non-full policy fails
closed. Payloads containing sensitive field names are rejected.

## Source approval matrix

Policy review date is 2026-07-28. Enabled sources are still
`proposedEvidenceOnly` under #131: their observations may be written only to an
isolated target, and they cannot create or advance current resolution heads.

| Adapter | State | Metadata | Text | Assets | Operational decision |
|---|---|---|---|---|---|
| `bukie.editorial` | enabled | `work.preferred_title` | `work.description` | none | Bukie-owned evidence; internal actor/reason audit required |
| `wikidata.work-facts` | enabled | `work.preferred_title` and `work.first_publication_date` candidates | none | none | CC0 structured work facts only; no edition authority and no Wikipedia prose |
| `open-library.metadata` | pending | none | none | none | Retention, display, and bulk-access policy pending |
| `open-library.descriptions` | pending | none | none | none | Third-party prose rights policy pending |
| `open-library.covers` | pending | none | none | none | Identity, caching, transformation, and asset-display policy pending |
| `google-books` | pending | none | none | none | Caching, branding, quota, retention, and third-party terms pending |
| `publisher.official` | pending | none | none | none | No approved feed or reusable text/asset license |
| `worldcat.oclc` | pending | none | none | none | Licensed access and data-use terms pending |
| `isbn.commercial` | pending | none | none | none | Contract, retention, display, and withdrawal terms pending |
| `wikipedia.prose` | pending | none | none | none | Attribution, share-alike, copying, spoiler, and drift policy pending |
| `web-content.retailer-competitor-search` | pending | none | none | none | Scraping and ingestion are prohibited |

The Wikidata policy cites the official
[licensing](https://www.wikidata.org/wiki/Wikidata:Licensing) and
[data-access](https://www.wikidata.org/wiki/Wikidata:Data_access) guidance.
Its policy is reviewed separately from Wikipedia prose.

## Identity, matching, and deterministic evidence

The matcher applies these rules in order:

1. a withdrawn source record produces a withdrawn outcome;
2. adaptation, translation, edition, or other explicit identity conflicts
   produce an ambiguous review outcome;
3. an exact identifier may activate a link;
4. an existing provider-native work relation may activate a work link;
5. a strong structured tuple creates a candidate;
6. normalized title plus ordered creator creates a candidate only; and
7. title alone remains unmatched.

Wikidata work links never make publisher, page, format, cover, or edition date
claims authoritative. The current allowed Wikidata field set contains no
edition fields.

Run, source-snapshot, source-record-revision, proposed-link, and observation
IDs are deterministic UUIDv5 values. Observation identity includes the source
record revision, entity, field, and normalized value hash. Duplicate
source-record revisions in one run fail closed because deterministic identity
would be ambiguous. Provider response order, input order, and database row
order are sorted away before hashing.

Composite identities use canonical JSON tuple hashes rather than delimiter-
joined strings, so provider-controlled record keys and revisions cannot create
ambiguous identities. Snapshot revision sets are likewise hashed as sorted
arrays.

## Isolated persistence and telemetry

The run artifact contains ADR 0016-compatible metadata-source, source-record,
source-link, and field-observation rows. Persistence intentionally has no
field-resolution or field-resolution-head write path. SQLite persistence
checks the complete current-head hash before and after every transaction.
SQLite and Postgres also compare every reused row with its recorded semantic
content inside the transaction. Reusing an identity with a different policy,
source-row hash, link decision, value, or provenance fails closed and rolls
back the complete run.

The structured report distinguishes:

- requested and successful records;
- cache and conditional hits;
- latency, retries, status classes, throttling, `Retry-After`, and bytes;
- source-revision age;
- unmatched, candidate, ambiguous, active, rejected, and withdrawn links;
- created, reused, rejected, and omitted observations;
- policy blocks;
- acquisition, provider, parsing, and normalization failures; and
- review-queue candidates.

Acquisition telemetry retains per-attempt status classes and 429 counts,
including failed retry sequences. Structured failure inputs carry stable
categories and numeric diagnostics without retaining error text that could
contain provider payloads or credentials. Persistence reports created and
reused rows separately; rejected and omitted observations are distinguished in
the deterministic run report.

No external observability vendor is used.

## Disposable five-work proof

Run only against a new or disposable SQLite path accepted by the existing
catalog rebuild safeguards:

```powershell
bun run db:catalog:enrichment-sample --target=sqlite:.data/catalog-targets/issue-131-enrichment-test.sqlite --confirm-disposable
```

The command:

1. creates a five-work-only baseline in the disposable target;
2. persists the same recorded Bukie editorial and Wikidata fixture revision
   twice;
3. verifies the second pass creates no logical rows;
4. compares complete isolated-enrichment snapshot hashes;
5. verifies current resolution-head hashes are unchanged; and
6. reports that no catalog-wide scan, public projection write, pending-provider
   write, or current-head write occurred.

The recorded fixture currently produces ten source records and links, nine
immutable observations, and one honest review candidate. *Dune* remains
ambiguous because same-title adaptations and series results were present; its
Wikidata observation is omitted rather than hidden with a source-specific
shortcut.

SQLite/Postgres persistence adapters serialize the recorded fixture to
equivalent logical rows. Live Postgres rebuild coverage remains gated by the
existing explicitly isolated `CATALOG_TEST_POSTGRES_URL`; no application or
preview database is used by this workflow.

## Evidence-gated descriptions

Issue #133 implements the three description classes approved by the research:

| Class | Required immutable provenance | Eligibility path |
|---|---|---|
| `licensed_verbatim` | exact source revision, license URL/name, attribution decision, derivative permission, source policy version | automated gates may pass exact licensed text; any warning requires review |
| `bukie_editorial` | approved parent observations, editor, editorial reason and revision | independent reviewer approval is required |
| `model_assisted_candidate` | every parent and claim mapping, provider-neutral model/version, prompt version, input hash, generation time/duration, tokens, cost, and policy version | every initial candidate requires human approval |

No model provider is selected or called. Tests and the diagnostic command use
deterministic recorded fixtures under the same provider-neutral contract.
Wikidata structured facts may be parent evidence only when their source/link
and field policy are currently eligible; they are never treated as prose.
Wikipedia, publisher, retailer, competitor, and search-result prose remain
disabled by the source-policy matrix above.

Automated gates use stable reason codes for parent support, identity,
unresolved evidence conflicts, length, readability, specificity, neutral tone,
spoilers, copying similarity, licensing, source revision, and source policy.
An exact eight-word source match is only
`copying_exact_eight_word_match`, a review warning. It is not a legal
determination and cannot approve or reject text on its own. A distinct high
similarity rule can reject a candidate as `copying_similarity_high`.
Ambiguous and sensitive cases also enter human review. The advisory quality
score is stored and reported but is never read by an eligibility decision.

The review queue has a transactionally enforced capacity and one operational
row per candidate. SQLite uses an immediate transaction; Postgres combines a
row lock with an advisory transaction lock around the active-count check.
Retries deduplicate deterministically. At capacity, a candidate becomes
`paused` and no queue row or eligibility is created. It can be queued only
after capacity becomes available.

Description decision and internal projection histories are immutable linked
events. Human decisions, withdrawal, source-policy revocation, policy/model/
prompt invalidation, re-review, selection, and rollback advance their heads in
one transaction. Read-time checks still apply current source, record, identity
link, parent evidence, conflict, model, prompt, and policy state. These
description heads are diagnostic only: they do not update `works.description`
or public field-resolution heads.

Run the reproducible five-work SQLite proof only against an explicitly
disposable target:

```powershell
bun run db:catalog:description-sample --target=sqlite:.data/catalog-targets/issue-133-description-test.sqlite --confirm-disposable
```

The recorded proof creates five model candidates, exercises approved, rejected,
withdrawn, and queued states, retries every candidate, and reports exact
coverage, queue, token, cost, and linearly scaled 500-work estimates. It also
hashes public resolution heads and work description values before and after
the run and refuses to finish if either changes. Rebuilding and rerunning the
same manifest produces the same candidate IDs, snapshot hash, and metrics.
