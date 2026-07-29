# Catalog Metadata and Provenance Decision

- Status: accepted
- Date: 2026-07-26
- Owners: catalog and discovery
- Related issue: #107

## Context

Bukie's current `books` row mixes work-level facts (title, author, genre and
description), edition-level facts (ISBN, publisher, publication year, pages and
cover), catalog operations (`added_at`) and synthetic discovery signals
(`rating`, `ratings_count` and `book_metrics`). A single text value for author,
genre and ISBN cannot represent common catalog records, and the row does not
record why a value is trusted, when it was retrieved or whether it may still be
displayed.

The current shape is a useful development snapshot, not a long-term
compatibility contract:

- `books.id` is currently used by detail URLs, cursor pagination and cover
  filenames;
- cards and details consume the flat `Book` type during server rendering;
- SQLite is the local-development database and Postgres is used in previews and
  production;
- cover values are provider-neutral `/covers/<id>.<ext>` paths;
- import updates match ISBN first, then normalized title and author;
- current ratings and trending metrics may be synthetic and must not silently
  become trusted catalog facts.

Bukie is still under development, so the target model may replace the current
catalog tables, IDs, routes and flat domain contract in one planned cutover.
The curated catalog content and R2 object keys should be reused where valid,
but avoiding temporary breakage of an unreleased schema is not a design driver.
The target model therefore needs bibliographic boundaries and field-level
provenance without becoming a universal ontology.

## Decision drivers

- Prefer the smallest coherent target model over legacy-table compatibility.
- Preserve reusable catalog content and cover objects without coupling their
  identity to new work or edition IDs.
- Model the work people recognize separately from a publishable edition.
- Represent ordered authors and multiple categories, identifiers, languages,
  publishers, dates and covers.
- Make every displayed imported, curated, derived or synthetic value
  explainable.
- Resolve conflicts deterministically without deleting competing observations.
- Use constraints and query shapes supported consistently by Drizzle, SQLite
  and Postgres.
- Keep ratings policy separate from catalog metadata policy.
- Allow source-specific caching, attribution, refresh and withdrawal rules.

## Considered options

### Keep extending `books`

Adding more scalar or JSON columns would preserve simple reads, but it would
keep work and edition identity ambiguous. Arrays encoded as JSON would be hard
to constrain and index consistently, and field-level provenance would remain
bolted on.

### Store provider payloads and resolve everything at read time

Raw payloads are useful for audit and reprocessing, but provider schemas are
not a stable product contract. Resolving on every SSR request would make
latency, availability and output depend on external sources.

### Normalize catalog entities and retain a small provenance ledger

Normalized work, edition and vocabulary tables provide stable queryable facts.
Source records and field observations retain evidence, while explicit
resolutions materialize the selected values used by SSR. This adds tables and a
resolution step, but it keeps the product model provider-neutral and auditable.

## Decision

Use normalized catalog entities plus a controlled field-observation ledger.

1. A **work** is the abstract intellectual creation users discover.
2. An **edition** is a particular publication of a work. ISBN, publisher,
   publication date, language, page count and cover are edition-scoped.
3. Catalog browse/search returns one result per work. Product-facing summary
   IDs and canonical `/books/<id>` routes use `work.id`; a deterministic
   preferred edition supplies edition-specific display fields.
4. Work, edition and other internal entity IDs are target-owned opaque UUID
   strings. Rebuild imports derive initial work/edition UUIDv5 values from a
   fixed Bukie namespace plus entity type, source key and record key, making
   clean rebuilds stable without copying the old ID into the entity ID. New
   entities without a stable source key use UUIDv4. Existing `books.id` values
   are retained only as keys on `legacy_catalog` source records.
5. Existing provider-neutral cover paths and R2 objects may be reused as asset
   object keys. Cover keys are not entity IDs and do not define work/edition
   identity.
6. Imported and curated claims are immutable observations. A versioned
   resolution chooses the value projected into product reads.
7. Hot SSR fields and selected relationships are stored in normalized
   relational columns/tables. JSON is limited to source payload snapshots and
   typed observation values; filters do not depend on JSON queries.
8. The old `books` and `book_metrics` tables are replaced after a verified
   export/reseed rehearsal. Schema implementation and cutover are separate work
   from this decision.

The target relationships are:

```mermaid
erDiagram
  WORKS ||--|{ EDITIONS : has
  WORKS ||--o{ WORK_AUTHORS : credits
  AUTHORS ||--o{ WORK_AUTHORS : participates
  WORKS ||--o{ WORK_CATEGORIES : classified_as
  CATEGORIES ||--o{ WORK_CATEGORIES : contains
  EDITIONS ||--o{ EDITION_IDENTIFIERS : identifies
  EDITIONS ||--o{ EDITION_LANGUAGES : uses
  LANGUAGES ||--o{ EDITION_LANGUAGES : names
  EDITIONS ||--o{ EDITION_PUBLISHERS : published_by
  PUBLISHERS ||--o{ EDITION_PUBLISHERS : publishes
  EDITIONS ||--o{ EDITION_COVERS : depicts
  COVER_ASSETS ||--o{ EDITION_COVERS : selected_for
  METADATA_SOURCES ||--o{ SOURCE_RECORDS : supplies
  SOURCE_RECORDS ||--o{ SOURCE_RECORD_LINKS : maps_through
  SOURCE_RECORDS ||--o{ FIELD_OBSERVATIONS : contains
  FIELD_OBSERVATIONS ||--o{ FIELD_RESOLUTIONS : selected_by
  FIELD_RESOLUTIONS ||--o| FIELD_RESOLUTION_HEADS : current_for
```

## Identity and entity boundaries

### Work

A work owns the preferred title, descriptions, ordered creator credits and
catalog categories. A translation, format, publisher change, pagination change
or revised cover does not by itself create another work. A substantively
different adaptation, abridgement or independently authored revision may be a
different work and must be curated when source identity is ambiguous.

Work grouping is conservative:

- a provider work identifier can support grouping only within that provider;
- a shared ISBN cannot group works because ISBN identifies an edition;
- normalized title/author similarity is a candidate signal, never an automatic
  merge;
- an uncertain match creates a separate work and a review item;
- a work merge creates an auditable alias from the retired work to the
  survivor;
- a work split retains the original ID for one resulting work, creates new IDs
  for the others and records every edition reassignment in a catalog change
  event.

### Edition

An edition owns the publication statement: edition title/subtitle, format,
publishers, publication date and precision, languages, page count, identifiers
and covers. Every edition belongs to exactly one work. An edition can lack an
ISBN, publisher, date, page count or cover.

An existing row initially imports as one edition and one work unless structured
source evidence proves a grouping. Rows are not combined from title/author
similarity alone. Later review may attach multiple editions to a work without
changing the edition IDs generated by the target importer.

### Author

An author is a credited person or organization. Names are not unique
identifiers. `work_authors` preserves source order and a controlled role such
as `author`, `editor`, `translator` or `illustrator`. At least one primary
creator is preferred, but anonymous and unattributed works are valid.

### Category

A category is a Bukie-owned discovery vocabulary with a stable slug and display
label. Provider subjects remain observations and map through versioned mapping
rules; they do not create public categories automatically. A work may have many
categories and one optional primary category.

### Identifier

Identifiers belong to editions unless a scheme explicitly identifies another
entity. ISBN-10 and ISBN-13 are normalized by removing separators and
uppercasing `X`; display formatting is separate. Valid ISBN values are unique
per scheme across active editions. A collision is a conflict requiring review,
not an automatic overwrite. Provider and legacy record keys belong in
`source_records`, not in `edition_identifiers`.

### Publisher and language

An edition may credit multiple publishers in order, with an optional role.
Publisher names are not merged on spelling alone. Languages use normalized
BCP 47 tags where possible, preserve the raw source value in observations, and
allow multiple ordered values.

### Publication date

Publication dates are ISO-like text plus a precision enum: `year`, `month` or
`day`. Examples are `1965`, `1965-06` and `1965-06-01`. A separate derived
`publication_sort_date` uses the first day of an incomplete period and must
never be displayed as more precise than the source.

An edition has one selected primary issue/publication date and may have many
competing source observations for that field. A materially distinct reprint or
publication statement is modeled as another edition. Additional event types
such as an original work date may be added as separately named work fields when
a product use case requires them; they are not overloaded into the edition
issue date.

#### 2026-07-28 amendment: work first publication

The [book-detail enrichment benchmark](../research/book-detail-enrichment.md)
establishes that product use case. A future implementation may add
`first_publication_date`, `first_publication_precision`, and the derived
`first_publication_sort_date` to `works`, with the field key
`work.first_publication_date`.

The value is nullable, selected from work-level observations, and uses the same
partial-date rules as an edition publication date. An importer must not seed it
by copying `editions.publication_date`; matching values still need independent
work evidence. A conflict is omitted from reader, API, metadata, and structured
data projections until it is resolved. Reader-facing copy distinguishes
**First published** for the work from **Published** for the selected edition.

This amendment approves the semantic boundary only. It does not authorize a
schema, data, UI, metadata, or JSON-LD change without a focused implementation
issue and SQLite/Postgres parity tests.

### Cover asset

A cover asset has a provider-neutral object key, media metadata, lifecycle
state and rights/source policy reference. `edition_covers` supports multiple
ordered covers and one selected primary cover. Existing
`/covers/<legacy-id>.<ext>` values and R2 objects may remain valid asset keys
even though the target work and edition IDs are newly generated.

## Provenance model

### Source and source record

`metadata_sources` describes a source and its operational policy. A source may
be an external provider, a Bukie-curated catalog, a migration, or a derivation
process. `source_records` identifies a specific upstream record/revision and
optionally retains a payload snapshot when policy permits.
`source_record_links` maps that evidence to zero or more Bukie entities. This
allows one legacy record to support both work- and edition-level observations,
and allows a record to remain unmatched without inventing a target.

Every source policy records:

- stable source key and human-readable name;
- terms and attribution URLs plus the date reviewed;
- whether metadata and assets may be fetched, cached, transformed and
  displayed;
- required attribution text/link and display placement;
- maximum retention or refresh interval, if any;
- deletion/termination behavior;
- allowed access method and request limits;
- payload-storage policy: `none`, `selected_fields` or `full`;
- an approval state. `pending` sources cannot feed public resolutions.

### Field observation

An observation is an immutable claim from one source record about one
controlled field on one target entity. It stores:

- target entity type and ID;
- controlled `field_key`;
- typed JSON value and a normalized comparison hash;
- provenance kind: `curated`, `imported`, `derived` or `synthetic`;
- source record and source field path;
- upstream modified time when supplied;
- retrieval time;
- mapping confidence from `0` to `1`;
- lifecycle state: `active`, `stale`, `withdrawn` or `invalid`;
- a stable actor reference and reason when the observation is curated;
- optional derivation name/version and parent observation IDs.

Mapping confidence means confidence that Bukie interpreted and matched the
claim correctly. It is not a probability that the underlying fact is true.
Synthetic observations must always carry `synthetic` provenance and may never
win resolution for bibliographic facts outside explicit development fixtures.

#### 2026-07-29 amendment: description evidence and review

Descriptions have one explicit class: licensed verbatim, Bukie editorial, or
model-assisted candidate. Each is still a `work.description` observation, but
text requires additional immutable provenance and review state before it can
be considered for a resolution.

- Licensed verbatim text retains its license, attribution decision, source
  revision, policy version, and derivative permission. It is not summarized,
  translated, or otherwise transformed unless both the rights record and
  source policy explicitly permit derivatives.
- Bukie editorial text retains every approved parent observation, its editor,
  an independent reviewer before eligibility, reason, and editorial revision.
- A model-assisted candidate retains every claim-to-parent mapping, a
  provider-neutral model identifier and version, prompt version, generation
  input hash and time, token/cost telemetry, and policy version. It remains a
  candidate until deterministic gates and required human review pass.

The deterministic gates cover parent eligibility, claim support, identity,
unresolved conflicts, length, readability, specificity, tone, spoilers,
copying similarity, ambiguity, and sensitivity. Exact eight-word overlap is a
review warning, not a legal conclusion or an automatic eligibility decision.
Quality scores are advisory and never select a candidate.

Description candidates, claims, claim evidence, decisions, decision heads,
review queue rows, internal projection events, and projection heads are
separate normalized tables with SQLite/Postgres parity. The queue is bounded
and deduplicated; overflow pauses or omits work. Decisions and internal
projections advance transactionally and retain withdrawal, invalidation,
re-review, and rollback history.

This internal projection is for the diagnostic proof and planned dry run. It
does not advance `field_resolution_heads` or update `works.description`.
`proposedEvidenceOnly`, field text permission, source approval, active identity
links, observation/source lifecycle, current parent eligibility, and current
policy/model/prompt versions are reapplied at read time. Public promotion
remains subject to the separate dry-run approval.

### Field resolution

A resolution is an immutable event storing the selected observation for a
controlled field, its preceding resolution, resolver version, resolution time,
actor and state:

- `present`: one observation is selected;
- `missing`: no eligible observation exists;
- `conflicting`: eligible observations disagree and policy cannot safely pick;
- `stale`: the selected value is past its source/field freshness target;
- `withdrawn`: the previous selection can no longer be used.

`field_resolution_heads` stores the single current resolution ID for each
entity/field. Advancing a head and projecting the selected value into the owning
normalized table or relation occur in one transaction. The immutable event
chain is the ownership and audit record for derived projection fields.
Re-running the same resolver version over the same observations must be
idempotent and must not append an equivalent event.

### Precedence and conflicts

Precedence is field-specific, not a single global source ranking:

1. an active Bukie-curated correction with a reason wins;
2. otherwise use eligible approved sources in the field policy's configured
   order;
3. prefer a more precise value only when it does not contradict a less precise
   value;
4. use retrieval time only between equivalent claims from the same source;
5. do not use mapping confidence as a hidden tie-breaker for contradictory
   facts;
6. if no safe deterministic choice exists, mark `conflicting` and either show
   the agreed lower-precision value or omit the field.

Curated corrections do not delete imported evidence. Their observation must
identify a stable actor reference and reason, and their resolution event must
reference the preceding resolution. Changing precedence creates a new resolver
version and supports a dry-run diff before promotion.

## Missing, stale, conflicting and withdrawn behavior

| State | Storage behavior | Product behavior | Refresh behavior |
|---|---|---|---|
| Missing | Store no fabricated value; resolution is `missing` when useful for refresh scheduling | Omit the field or show an explicit neutral unavailable state | Retry only according to source schedule; absence is never zero or an empty string |
| Conflicting | Retain all observations and the conflict reason | Show only a non-conflicting lower-precision value, or omit; never pick nondeterministically | Queue review or wait for stronger evidence |
| Stale | Keep the observation and original timestamps | Bibliographic facts may remain visible with `as of` context when policy permits; exclude stale freshness-sensitive signals from ranking | Refresh according to field/source target with backoff |
| Withdrawn | Tombstone the observation/source record; retain only audit material permitted by policy | Immediately resolve to another eligible value or missing; purge display/cache data when required | Do not refetch until the source policy is approved again |
| Invalid | Retain validation reason and raw value only when permitted | Never project or display | Reprocess only after parser/mapping changes |

Null, missing, unknown, not-applicable and withheld are distinct concepts. A
source omitting a field creates no positive claim that the value does not
exist. Empty strings, zero pages, zero dates and placeholder factual copy are
not valid substitutes.

## Data dictionary

Legend:

- **R**: required at steady state
- **O**: optional
- **D**: derived/materialized
- **S**: synthetic values allowed only in marked fixtures
- **P**: selected value or relationship has provenance through a resolution

All timestamps are UTC epoch milliseconds in both databases unless a field is
explicitly an ISO partial date. IDs are opaque text UUIDs.

### Core entities

| Table | Field | Class | Meaning and constraint |
|---|---|---:|---|
| `works` | `id` | R | Internal immutable work ID; primary key |
| | `preferred_title` | R,P | Selected work title; non-empty |
| | `sort_title` | D | Normalized title for ordering, never displayed |
| | `description` | O,P | Selected work-level description |
| | `first_publication_date` | O,P | ISO partial date of the work's first publication, selected only from eligible work evidence |
| | `first_publication_precision` | O,D | `year`, `month` or `day`, consistent with the work date |
| | `first_publication_sort_date` | O,D | Full ISO date for sorting only; not used by current catalog sorting |
| | `preferred_edition_id` | O,D | Selected display edition; must belong to this work |
| | `created_at`, `updated_at` | R | Catalog audit timestamps |
| `editions` | `id` | R | Internal immutable edition ID; existing `books.id` is copied exactly |
| | `work_id` | R | Foreign key to `works`; immutable except reviewed work merge/split |
| | `title`, `subtitle` | O,P | Edition-specific title statement when different/useful |
| | `format` | O,P | Controlled format such as hardcover, paperback or ebook |
| | `publication_date` | O,P | ISO partial date text |
| | `publication_precision` | O,D | `year`, `month` or `day`, consistent with date text |
| | `publication_sort_date` | O,D | Full ISO date for sorting only |
| | `pages` | O,P | Positive integer; pagination may legitimately differ by edition |
| | `cataloged_at` | R | Bukie catalog-add timestamp; replaces ambiguous `added_at` naming |
| | `created_at`, `updated_at` | R | Catalog audit timestamps |
| `authors` | `id` | R | Internal immutable author/person/organization ID |
| | `display_name` | R,P | Non-empty selected name |
| | `sort_name` | O,D | Ordering/search value, never used as identity |
| `work_authors` | `work_id`, `author_id`, `role` | R,P | One credit per work/author/role; the same contributor may hold multiple roles |
| | `position` | R,P | Zero-based source/curated display order; unique per work |
| | `role` | R,P | Controlled role; default `author` |
| `categories` | `id` | R | Internal category ID |
| | `slug` | R | Unique stable Bukie-owned URL value |
| | `label` | R,P | Public label |
| | `status` | R | `active` or `retired`; retired slugs redirect |
| `work_categories` | `work_id`, `category_id` | R,P | Unique relationship |
| | `position` | R,P | Stable display order |
| | `is_primary` | R,P | At most one true per work |
| `publishers` | `id` | R | Internal publisher ID |
| | `display_name` | R,P | Non-empty name; spelling alone does not establish identity |
| `edition_publishers` | `edition_id`, `publisher_id` | R,P | Unique relationship |
| | `position`, `role` | R,P | Ordered credit and optional controlled role |
| `languages` | `tag` | R | Normalized BCP 47 tag; primary key |
| | `label` | R,D | Local display label |
| `edition_languages` | `edition_id`, `language_tag` | R,P | Unique relationship |
| | `position` | R,P | Stable order; zero is primary |
| `edition_identifiers` | `id` | R | Internal row ID |
| | `edition_id` | R | Owning edition |
| | `scheme` | R,P | Controlled scheme such as `isbn10` or `isbn13` |
| | `value_normalized` | R,P | Canonical comparison value |
| | `value_display` | O,P | Source/curated display formatting |
| | `is_primary` | R,P | At most one primary identifier per edition |
| `cover_assets` | `id` | R | Internal asset ID |
| | `object_key` | R,P | Unique provider-neutral `/covers/...` value |
| | `media_type`, `width`, `height`, `bytes`, `checksum` | O,P | Verified asset metadata |
| | `state` | R | `available`, `missing`, `withdrawn` or `failed` |
| | `source_policy_id` | O | Policy governing the original asset |
| `edition_covers` | `edition_id`, `cover_asset_id` | R,P | Unique relationship |
| | `position` | R,P | Stable order |
| | `is_primary` | R,P | At most one primary cover per edition |

### Provenance and operational entities

| Table | Field | Class | Meaning and constraint |
|---|---|---:|---|
| `metadata_sources` | `id`, `key`, `name` | R | Internal ID, unique stable key and display name |
| | `terms_url`, `attribution_url`, `reviewed_at` | O | Policy evidence; review date required before approval |
| | `approval_state` | R | `pending`, `approved`, `suspended` or `retired` |
| | `metadata_policy`, `asset_policy`, `payload_policy` | R | Controlled cache/display/transform/retention decisions |
| | `refresh_interval_ms` | O | Default source refresh target; a field policy may override it |
| `source_records` | `id`, `source_id`, `record_key` | R | Unique `(source_id, record_key)` |
| | `source_revision`, `source_modified_at` | O | Upstream version and modification time when supplied |
| | `retrieved_at` | R | UTC retrieval time |
| | `payload_json`, `payload_hash` | O | Retained only when source policy permits |
| | `state` | R | Upstream lifecycle: `active`, `withdrawn` or `deleted`; unmatched means no active link |
| `source_record_links` | `source_record_id`, `entity_type`, `entity_id` | R | Unique evidence-to-entity mapping; a record may link to work and edition targets |
| | `match_kind` | R | `exact_identifier`, `source_relationship`, `curated` or `candidate` |
| | `mapping_confidence`, `state` | R | Confidence `0..1`; state is `active`, `candidate` or `rejected` |
| | `actor_ref`, `reason`, `created_at` | O | Actor/reason required for curated or rejected links |
| `field_observations` | `id`, `source_record_id` | R | Immutable observation and evidence record |
| | `entity_type`, `entity_id`, `field_key` | R | Controlled target and field |
| | `value_json`, `comparison_hash` | R | Typed claim and normalized equality hash |
| | `provenance_kind` | R,S | `curated`, `imported`, `derived` or `synthetic` |
| | `source_path`, `source_modified_at` | O | Upstream field path and modification time when supplied |
| | `retrieved_at` | R | UTC retrieval time |
| | `mapping_confidence` | R | Numeric `0..1`, meaning mapping confidence only |
| | `state` | R | `active`, `stale`, `withdrawn` or `invalid` |
| | `actor_ref`, `reason` | O | Both required for curated observations; actor is `system:<process>` or `user:<internal-id>` |
| | `derivation_name`, `derivation_version`, `parent_ids_json` | O,D | Required together for derived observations |
| `field_resolutions` | `id` | R | Immutable resolution event |
| | `entity_type`, `entity_id`, `field_key` | R | Controlled target and field; indexed but not unique across event history |
| | `selected_observation_id` | O | Null for missing/conflicting/withdrawn |
| | `state`, `reason` | R | Resolution state and explainable reason |
| | `previous_resolution_id` | O | Prior event for the same target/field; null only for the first event |
| | `actor_ref` | R | `system:<resolver>` or `user:<internal-id>` |
| | `resolver_version`, `resolved_at` | R,D | Reproducible policy version and time |
| `field_resolution_heads` | `entity_type`, `entity_id`, `field_key` | R,D | Primary key identifying one current resolution per target/field |
| | `resolution_id` | R,D | Unique current event; must target the same entity/field |
| `entity_aliases` | `entity_type`, `from_id`, `to_id` | O | Audited merge redirect from a retired entity to one survivor; IDs never reused |
| | `reason`, `created_at` | R | Review evidence |
| `catalog_change_events` | `id`, `change_type`, `actor_ref` | O | Immutable merge/split/reassignment audit event |
| | `payload_json`, `reason`, `created_at` | R | Affected entity/edition IDs, explanation and UTC time |

### Current-field mapping

| Current `books` field | Target | Backfill rule |
|---|---|---|
| `id` | `source_records.record_key` | Preserve under the internal `legacy_catalog` source; generate new work and edition IDs |
| `title` | `works.preferred_title`; optional `editions.title` observation | Preserve value; do not infer subtitle |
| `author` | `authors` + `work_authors` | Preserve the full string as one author unless structured source data or review can split it safely |
| `genre` | `categories` + `work_categories` | Map only through an explicit Bukie category map |
| `cover` | `cover_assets.object_key` + `edition_covers` | Preserve provider-neutral path and existing object |
| `year` | edition partial date | Convert four digits to `publication_date` with `year` precision |
| `publisher` | `publishers` + `edition_publishers` | Preserve as one publisher; no spelling-based merge |
| `isbn` | `edition_identifiers` | Normalize and validate; invalid values remain invalid observations, not identifiers |
| `pages` | `editions.pages` | Copy only positive integers |
| `description` | `works.description` | Import as a legacy observation; known generic fallback text resolves to missing |
| `added_at` | `editions.cataloged_at` | Preserve epoch milliseconds; it is not publication time |
| `rating`, `ratings_count` | no catalog target | Export for audit only, mark synthetic where applicable, and defer any reintroduction to ratings architecture |
| `book_metrics` | no catalog target | Do not import; it is synthetic operational/ranking data rather than bibliography |

### Target summary and route contract

The replacement domain contract is work-first and does not preserve the flat
`Book` identity:

- `BookSummary.id` is `works.id`;
- `BookSummary.preferredEdition.id` is the selected `editions.id`;
- the summary title/authors/categories come from the work;
- publication date, language, publisher, identifier and cover come from the
  preferred edition;
- `/books/<work-id>` is the canonical detail route;
- alternate editions remain addressable within the work detail experience by
  their edition IDs;
- cover `object_key` values remain independent of both IDs.

## Constraints supported by SQLite and Postgres

Use ordinary primary keys, foreign keys, unique indexes, check constraints and
join tables that both databases support. Drizzle definitions for SQLite and
Postgres must express the same logical constraints even where column types
differ.

Typed observation and policy JSON uses canonical serialized text guarded by
`json_valid` in SQLite and `jsonb` in Postgres; comparison hashes are computed
from the same canonical serialization so resolution semantics remain equal.

Required invariants:

- non-empty normalized titles, names, source keys and identifier values;
- exactly one work per edition;
- unique author-role/category/publisher/language relationship per owner;
- unique relationship positions per owner;
- no more than one primary category per work and one primary cover/identifier
  per edition (enforced with a transaction and, where parity permits, a partial
  unique index);
- globally unique active ISBN value per scheme;
- observation confidence between zero and one;
- unmatched source records have no active links; only active links may support
  projected observations;
- source-record links target existing entities, and curated/rejected links have
  an actor and reason;
- imported observations target an entity actively linked to their source
  record;
- curated observations have an actor and reason;
- selected observations target the same entity/field as their resolution;
- each resolution head points to an event for the same entity/field, and each
  noninitial event points to the preceding event for that entity/field;
- a preferred edition belongs to its work;
- derived observations name their algorithm and version;
- synthetic observations cannot become public bibliographic resolutions.

SQLite foreign keys must be enabled on every connection. Multi-table
resolution and projection changes occur in one transaction. Application-level
checks are required where SQLite and Postgres cannot share an identical
deferred or partial constraint; concurrency tests against Postgres must protect
those checks.

## Required indexes and query shapes

Index names are illustrative, but every implementation must provide equivalent
coverage in both schemas.

| Consumer | Query shape | Required indexes |
|---|---|---|
| SSR catalog cards | page works by deterministic `(sort_title, id)` or catalog order; join preferred edition, ordered authors, primary category and primary cover in bounded follow-up queries | `works(sort_title,id)`, `works(preferred_edition_id)`, relation owner/position indexes, primary-cover/category indexes |
| Book detail | lookup work ID, join its preferred/all editions, ordered authors/categories and edition languages/publishers/identifiers/covers, then fetch current provenance summaries | primary keys; `editions(work_id)`, every join table `(owner_id,position)`, `field_resolution_heads(entity_type,entity_id,field_key)` |
| Search | search selected work title and author display text; return distinct works and preferred editions | normalized title/author indexes initially; Postgres search-specific index may be added without changing semantics |
| Filters | intersect category slug, preferred-edition publication sort date and language; always tie-break with work ID | `categories(slug)`, `work_categories(category_id,work_id)`, `editions(publication_sort_date,work_id)`, `edition_languages(language_tag,edition_id)` |
| Cursor pagination | use every visible sort key plus work ID in the cursor; never paginate by non-unique score alone | composite index matching each supported sort |
| Source refresh | scan approved source records/observations by state and due time, claim bounded batches and resolve affected fields idempotently | `source_records(source_id,state,retrieved_at)`, `field_observations(source_record_id,field_key,state)`, resolution-head lookup |
| Rating aggregation | resolve a stable work ID and optional edition ID; rating storage and weights remain outside this ADR | work/edition primary keys and `editions(work_id)` only |

Avoid one join that multiplies authors, categories, identifiers and covers into
a Cartesian product. SSR repositories should fetch a page of work/edition IDs,
then load each ordered relation with bounded `IN` queries and assemble the
domain result. Query-count and duplicate-work tests must protect this shape.

## Import and update lifecycle

1. Register or load an approved source policy.
2. Fetch through the policy's allowed access method and rate limit.
3. Persist the source record/revision and permitted payload; it initially has no
   active entity links.
4. Match entities by valid unique identifiers or provider relationships already
   linked to them. Create work/edition targets when the import policy permits a
   new record, then attach active source-record links in a transaction. A
   title/author similarity match creates a candidate link only.
5. Create immutable field observations; validate and normalize without
   discarding the permitted raw claim.
6. Resolve only fields affected by changed observations using the active
   resolver version.
7. In the same transaction, append resolution events, advance their heads and
   update selected normalized fields/relations.
8. Produce an import report with created, matched, conflicted, invalid,
   withdrawn and unresolved counts.
9. Refresh caches only after commit. A retry of the same source revision must
   not create duplicate observations or change resolved output.

Curated edits use the same lifecycle through an internal curated source and
require an actor, reason and immutable observation. Direct updates to projected
fields are forbidden after cutover.

## Source terms, caching and display

This ADR does not approve any external source. Before a source can feed public
resolutions, its current official terms and usage guidance must be reviewed and
encoded in `metadata_sources`; legal review is required when rights or
derivative use are unclear.

For the source already used by cover tooling:

- its official API guidance describes low-volume, human-facing use, asks
  identified clients to send contact information, recommends caching, and
  directs bulk users to monthly dumps;
- its official licensing page says the operator asserts no new database rights
  while warning that contributed material may still carry existing rights;
- its official cover guidance says not to crawl the covers API, recommends
  direct source URLs for public display, and appreciates attribution links.

These statements are operational inputs, not a blanket grant to copy,
transform, retain or redistribute every field or cover. Before the next
metadata or cover refresh, record separate approved policies for metadata and
assets, including whether Bukie's private object cache and transformed WebP
assets are permitted. If approval is absent or later suspended, keep only
permitted audit identifiers and resolve affected public values/assets to
another eligible source or missing.

Official references:

- https://openlibrary.org/developers/api
- https://openlibrary.org/developers/dumps
- https://openlibrary.org/developers/licensing
- https://openlibrary.org/dev/docs/api/covers

## Development-stage rebuild, rehearsal and rollback

Schema implementation must be delivered separately and rehearsed on disposable
SQLite databases and a Postgres preview branch. Bukie has no public compatibility
commitment yet, so the rollout replaces the old catalog schema in one coordinated
cutover instead of maintaining dual writes or a long-lived compatibility view.

### Stage 0: export and fixtures

- Export the current catalog rows, catalog artifact revision, row counts,
  null/invalid counts, duplicate normalized ISBNs and cover object-key manifest.
- Freeze the representative cases below as target import fixtures.
- Record the current deployment commit and take a restorable Postgres snapshot.
- Add logical target schemas for both databases and compare generated SQL.

Rollback: no application or database changes have occurred.

### Stage 1: target schema and reset tooling

- Define the target SQLite/Postgres schemas, constraints and indexes.
- Add an explicit reset/rebuild command that refuses to run against production
  unless a separate production-confirmation flag and environment check agree.
- Register internal `legacy_catalog`, curated and derivation sources.
- Validate empty-schema parity in SQLite and an isolated Postgres preview branch.

Rollback: drop the isolated target database/branch; the current deployment and
database remain untouched.

### Stage 2: deterministic import/reseed

- Import each legacy/catalog record through the source-observation lifecycle.
- Store the old `books.id` as the `legacy_catalog` source-record key; generate
  new work and edition IDs.
- Reuse valid provider-neutral cover object keys after checking the R2 manifest.
- Do not group works from title/author similarity.
- Store an importer version and source-row hash so rebuilding from the same
  export produces the same relationships and resolution output.
- Reconcile imported, rejected, conflicting, missing and reused-cover counts.

Rollback: discard the rebuilt database and correct the importer or source data.

### Stage 3: application cutover

- Replace flat `Book` repositories and API/domain results with the work-first
  contract in the same implementation branch.
- Change catalog/detail routes to work IDs and use preferred editions for card
  metadata.
- Remove reads and writes against the old catalog tables.
- Run unit, database-parity and Playwright contracts against the rebuilt SQLite
  database and Postgres preview branch.

Rollback before production: redeploy the previous commit and its unchanged
database. No dual-write replay is required because the product has no catalog
mutation flow that must be preserved during the development cutover.

### Stage 4: preview then blue-green development-production cutover

- Verify the complete preview, including counts, representative work/edition
  routes, filters/search semantics and R2 cover responses.
- Export/snapshot once more, then build and seed an isolated target Postgres
  database/branch from the pinned artifact/export while the old application and
  database continue serving.
- Deploy the target code against that target database, run reconciliation and
  smoke checks, then switch the production alias/configuration to the matching
  application/database pair in one release operation.
- Retain the export, old database and previous deployment until the next
  verified release.

Rollback: switch back to the previous application/database pair. Restore its
snapshot only if it was changed unexpectedly; do not make old code read the
target schema or target code read the old schema.

Rehearsal gates for both databases:

- source export/input counts reconcile, with every rejected field explained;
- every old row ID is retained as a unique legacy source-record key;
- every reused cover key exists in the manifest or resolves to the placeholder;
- the import is idempotent and produces the same normalized relationships and
  resolutions on a second clean rebuild;
- work-first card/detail output matches expected fixtures;
- query plans use the intended indexes at catalog scale and at a 10x fixture;
- forced failure mid-import leaves a disposable, clearly failed rebuild rather
  than a partially promoted database;
- current SSR remains on the old pair until target SSR is verified, and rollback
  restores a matching application/database pair from rehearsal.

## Representative-record exercise

These fixtures exercise identity, cardinality and failure policy. Names and
values are intentionally illustrative rather than production catalog claims.

| Case | Input shape | Expected target/result |
|---:|---|---|
| 1 | One author, category, valid ISBN-13 and cover | One work/edition; ordered relations; stable target IDs generated; legacy ID retained as source key; cover object key reused |
| 2 | Two ordered authors with distinct source IDs | Two authors at positions 0/1; no joined author string as identity |
| 3 | Three categories, one mapped as primary | Three work-category rows; exactly one primary |
| 4 | Hardcover and translated paperback for one verified work | One work, two editions with independent language, publisher, date, pages, ISBN and cover |
| 5 | Edition has no ISBN but has a provider edition key | Edition remains valid; provider key stays in `source_records`; no fake identifier |
| 6 | Sources claim `1965` and `1965-06-01` | Select day precision when policies consider claims compatible; display exact selected precision |
| 7 | Approved sources claim incompatible publication years | Mark field conflicting; show no exact date until resolved |
| 8 | Title/author match but identifiers prove separate editions of uncertain works | Do not auto-merge works; create a review candidate |
| 9 | Source omits publisher, pages and cover | Store no empty observations; fields/covers resolve missing and UI collapses them |
| 10 | Selected description becomes stale | Keep value only if policy permits, expose freshness context, schedule refresh |
| 11 | Selected cover/source record is withdrawn | Tombstone evidence as permitted, purge cached asset if required, choose next eligible cover or placeholder |
| 12 | Legacy row contains generated rating/count and generic description fallback | Rating remains outside catalog target and marked synthetic; generic description resolves missing |

Together the cases contain 14 representative edition input records: cases 4
and 8 each contain two, and the other cases contain one. They resolve to 13
works because the two case-4 editions share one verified work while the case-8
records remain separate.

Walk-through invariants:

- list/card queries return 13 distinct works for the 14 input editions;
- work detail for case 4 returns both editions and selecting either edition
  returns its edition-specific facts;
- category and language filters do not duplicate the work;
- a refresh retry creates no duplicate observation or changed resolution;
- withdrawing a source never turns absence into zero, an empty string or a
  fabricated fallback.

## Automated-test contract for implementation slices

### Unit and database integration

- ISBN normalization/validation and collision handling;
- deterministic UUIDv5 import identity and UUIDv4 creation for source-less
  entities;
- partial-date parsing, precision and sort-date derivation;
- conservative work/edition matching and no title-only merges;
- unmatched, candidate and multi-entity source-record links;
- ordered multi-author/category/language/publisher relationships;
- deterministic field resolution for present, missing, compatible,
  conflicting, stale, invalid and withdrawn observations;
- curated precedence, resolver versioning and idempotent retries;
- immutable resolution history with one transactional head per entity/field;
- synthetic values cannot win public bibliographic resolution;
- SQLite/Postgres constraint and query-semantic parity;
- clean-rebuild stability for target IDs, cover keys, source hashes and a second
  import;
- transaction rollback on a failed projection update;
- work-first summary/detail projection for full and partial records;
- cursor tie-breaks and no duplicate works across pages.

### Playwright

- SSR catalog cards and canonical detail navigation use stable work IDs;
- multiple authors/categories render in defined order once the edition-aware UI
  slice exists;
- missing ISBN, publisher, date, description and cover do not produce invented
  facts or broken layout;
- a work with multiple editions appears once in discovery and each edition
  detail remains reachable;
- category/language/publication filters remain shareable and do not duplicate
  results once #110 is implemented;
- provenance/freshness disclosure is keyboard accessible when a UI slice adds
  it.

This documentation-only decision changes no executable behavior, so no new
unit or Playwright tests are added in this PR. Each implementation slice must
add the applicable tests above before changing production behavior.

## Follow-up implementation slices

The design can be implemented without reopening identity or provenance
decisions in these dependency-ordered slices:

1. Implement target SQLite/Postgres schemas, reset safeguards, deterministic
   catalog import/reseed, source policies, observations/resolutions and database
   parity tests.
2. Replace repositories, API/domain types and routes with the work-first
   contract; rehearse preview and production rebuild/rollback.
3. Adopt the edition-aware presentation in #108, #110, #109 and #112.
4. Attach ratings observations/aggregates to stable work/edition IDs only after
   the separate ratings architecture and identity dependencies are complete.

Start with one focused implementation issue for slice 1 after this ADR is
accepted. Create later issues only when the preceding slice is ready, avoiding
speculative backlog inflation. This ADR does not itself authorize schema/UI
work.

## Consequences

### Positive

- Work and edition identity become explicit without breaking existing links.
- Multiple values are normalized, ordered, constrained and queryable.
- Displayed metadata can explain source, freshness and conflict state.
- Source withdrawal and policy changes have a defined safe path.
- Catalog, discovery and ratings work share stable identity boundaries.

### Costs and risks

- More tables and bounded relation-loading queries replace one simple row.
- Import becomes a staged match/observe/resolve/project lifecycle.
- SQLite/Postgres parity needs deliberate integration coverage.
- Initial one-row/one-work import may preserve duplicate works until evidence or
  review safely groups them.
- The coordinated rebuild changes unreleased catalog URLs and requires a
  matching application/database rollback pair.
- Source policy requires recurring review rather than a one-time assumption.

## References

- [Database decision](./0010-database.md)
- [Image storage decision](./0015-image-storage.md)
- [Database and API architecture](../database-architecture.md)
- [Database section logic](../database-sections.md)
- [Book curation and import](../books-steps.md)
- `src/db/schema.ts`
- `src/db/schema.pg.ts`
- `src/db/provider.ts`
- `src/features/books/types.ts`
