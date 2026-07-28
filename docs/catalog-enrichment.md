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
| `wikidata.work-facts` | enabled | `work.preferred_title` candidate | none | none | CC0 structured work facts only; no edition authority and no Wikipedia prose |
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

## Isolated persistence and telemetry

The run artifact contains ADR 0016-compatible metadata-source, source-record,
source-link, and field-observation rows. Persistence intentionally has no
field-resolution or field-resolution-head write path. SQLite persistence
checks the complete current-head hash before and after every transaction.

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
