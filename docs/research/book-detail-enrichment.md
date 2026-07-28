# Book-detail enrichment benchmark

- Status: recommendation for review
- Date: 2026-07-28
- Tracking issue: [#130](https://github.com/amalv/bukie/issues/130)
- Depends on: [#107](https://github.com/amalv/bukie/issues/107),
[#108](https://github.com/amalv/bukie/issues/108), and
[#112](https://github.com/amalv/bukie/issues/112)
- Out of scope: ratings, reviews, recommendations, popularity, voting, and
reader-generated data; those remain in
[#111](https://github.com/amalv/bukie/issues/111).

## Executive recommendation

Enrich Bukie through the provenance ledger introduced by ADR 0016, not through
one-off projection updates or a single metadata provider.

1. Add a distinct, nullable, provenance-resolved
   `work.first_publication_date` fact. Keep the selected edition's
   `publication_date` unchanged and label the two facts **First published** and
   **Published** respectively.
2. Use Wikidata CC0 data as a work-level identifier and first-publication
   candidate, then corroborate ambiguity with Open Library, an official
   publisher, or a library authority. Never use title alone to auto-merge.
3. Treat official publisher data as preferred evidence for a selected modern
   edition. A public page is evidence, not permission to scrape, cache,
   transform, or republish its description or cover.
4. Separate Open Library metadata, descriptions, and covers into independent
   source policies. Its API and dumps are useful for candidate discovery, but
   its licensing guidance does not grant blanket rights to contributed content.
5. Prefer edition-matched, licensed cover assets over visually attractive but
   unverified images. Exact ISBN or an equivalently strong edition match and
   asset-display rights are hard gates.
6. Publish descriptions only when they are licensed verbatim text, Bukie-owned
   editorial text, or an approved model-assisted candidate that passed
   evidence, copying, spoiler, tone, and human-review gates.
7. Make the future enrichment job deterministic, idempotent, reversible,
   observable, rate-limited, and capable of a catalog-wide dry run that does
   not change current resolution heads or reader-facing projections.

This is a documentation-only recommendation. It does not change the schema,
catalog data, UI, metadata, or structured data.

## Method and limits

The benchmark combines:

- the current SQLite development catalog and the eligible `WorkDetail`
  projection;
- the five fixed works required by #130;
- official provider, licensing, and API documentation current on 2026-07-28;
- direct product-page inspection of six book-detail products; and
- public product or catalog pages for the fixed sample.

The initial shared-browser connection was unavailable, so product research
started from current web responses and locally inspected Bukie cover files.
On 2026-07-28, the shared Chrome extension became available and the six
benchmark pages were visually verified at 1440×1000 and 390×844. Bukie's live
*Dune* page was verified at both sizes and *Moby-Dick* at desktop size. No
screenshots were committed. No provider API was called at catalog scale and no
external data was written to Bukie.

Provider coverage in this document means a matching public record was found or
an explicit access test was made. It does not mean Bukie has permission to
retain or display every field on that record. Cost, runtime, and 500-work
coverage figures are planning ranges, not measured production results.

## Reader-value and feasibility rubric

Each aspect receives a 0–5 quality score:

| Score | Meaning |
|---|---|
| 0 | Absent, wrong, or unsafe to show |
| 1 | Present but unresolved or materially misleading |
| 2 | Partly useful with weak identity, completeness, or quality |
| 3 | Adequate and honest, but limited |
| 4 | Strong, well-matched, and useful |
| 5 | Verified ideal for Bukie's current product scope |

The weighted gap is:

`sum(aspect weight × (5 - current quality) / 5)`

A higher result means more reader value is currently missing. The score
prioritizes work understanding, edition identity, and a useful next step over
decorative density.

| Aspect | Weight | Why it matters |
|---|---:|---|
| Cover identity | 14 | A wrong edition or adaptation is actively misleading |
| Cover technical quality | 8 | Clear, stable imagery supports recognition |
| Description | 18 | The strongest current aid to deciding whether to continue |
| Work first publication | 10 | Gives historical context without edition mixing |
| Selected-edition publication | 10 | Identifies the product represented by its facts |
| Edition facts | 16 | Format, pages, publisher, language, and identifiers disambiguate |
| Creators, categories, and series | 10 | Establish authorship and browsing context |
| Hierarchy and continuation | 14 | Makes facts understandable and gives a valid next step |

Operational feasibility also uses 0–5, where 5 is best. It evaluates reader
value, evidence confidence, source availability, rights feasibility,
automation, scale, maintainability, and freshness safety. Two rules override
any average:

- identity confidence 0–1 blocks automatic public resolution; and
- rights feasibility 0–1 blocks display or cached-asset eligibility.

## Five-work audit

### Current catalog evidence

The development catalog exposes one preferred edition per work. The following
is the eligible state observed on 2026-07-28.

| Work | Description | Stored publication | Edition facts | Current cover |
|---|---|---|---|---|
| *Dune* | 60-character synopsis | `1965`, stored on the edition | ISBN-13 only | 500×500, 18.3 KiB |
| *Moby-Dick* | Missing | Missing | Missing | 327×500, 33.4 KiB |
| *The City and the Stars* | 56-character synopsis | `1956`, stored on the edition | Missing | 331×500, 39.2 KiB |
| *Born a Crime* | Missing | Missing | Missing | 320×500, 34.2 KiB |
| *Faithful Place* | Missing | Missing | Missing | 330×500, 45.4 KiB |

All five asset-ledger rows lack recorded media type, byte size, width, and
height even though the underlying files are readable. The current detail page
correctly omits absent facts and ineligible evidence; it does not invent
fallback metadata.

### Cover identity findings

- *Dune*: the stored ISBN is `9780441172719`, while the image is a square,
  white-sided movie-tie-in treatment. It is not reliable evidence for that
  selected edition. The live 2:3 `object-cover` frame crops away the square
  asset's sidebars and produces a plausible portrait, but visual plausibility
  does not repair the edition mismatch.
- *Moby-Dick*: the image is a French Delcourt/Bill Sienkiewicz adaptation-style
  cover, not a safe representation of the plain Melville work currently
  described by Bukie. The live desktop page confirmed the adaptation credit and
  Delcourt mark are prominent.
- *The City and the Stars*: the cover plausibly represents the work, but no
  selected-edition identifier proves the link and the source image is small.
- *Born a Crime* and *Faithful Place*: each image plausibly represents its
  work, but neither is tied to the selected edition by stored identifiers or
  asset-rights evidence.

The first two are not merely resolution issues. They demonstrate why cover
identity and rights must be gates instead of soft ranking signals.

### Quality scorecard

Aspect order is cover identity, cover quality, description, work first
publication, selected-edition publication, edition facts,
creator/category/series context, and hierarchy/continuation.

| Work | Identity | Image | Description | First | Edition date | Facts | Context | Flow | Weighted gap |
|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|
| *Dune* | 1 | 2 | 2 | 0 | 1 | 1 | 2 | 3 | 70.0 |
| *Moby-Dick* | 0 | 3 | 0 | 0 | 0 | 0 | 1 | 3 | 84.8 |
| *The City and the Stars* | 2 | 2 | 2 | 0 | 1 | 0 | 2 | 3 | 69.6 |
| *Born a Crime* | 2 | 3 | 0 | 0 | 0 | 0 | 2 | 3 | 77.2 |
| *Faithful Place* | 2 | 3 | 0 | 0 | 0 | 0 | 2 | 3 | 77.2 |

The scores are deliberately conservative. The two stored years coincide with
well-known work publication years, but Bukie models them as edition dates and
does not retain sufficient selected-edition evidence to relabel them.

### Evidence-confidence scorecard

This table rates confidence in the audit finding, not the desirability of the
current value.

| Work | Identity | Image | Description | First | Edition date | Facts | Context | Flow |
|---|---:|---:|---:|---:|---:|---:|---:|---:|
| *Dune* | 1 | 4 | 3 | 0 | 1 | 1 | 4 | 5 |
| *Moby-Dick* | 0 | 4 | 0 | 0 | 0 | 0 | 2 | 5 |
| *The City and the Stars* | 2 | 3 | 3 | 0 | 1 | 0 | 4 | 5 |
| *Born a Crime* | 2 | 3 | 0 | 0 | 0 | 0 | 4 | 5 |
| *Faithful Place* | 2 | 3 | 0 | 0 | 0 | 0 | 4 | 5 |

## Product benchmark

The products below are presentation benchmarks only. Their pages and content
are not enrichment sources.

| Product | Strong detail pattern | Caution for Bukie |
|---|---|---|
| [Goodreads](https://www.goodreads.com/book/show/53747.Dune) | Immediate cover/title/author recognition, synopsis, genre, first-publication context, selected format/pages, editions, and social continuation | Work and edition facts are visually close; ratings/reviews are explicitly outside #130 |
| [StoryGraph](https://app.thestorygraph.com/books/39a52cb0-cc71-4355-919c-6bd12d6d8fc6) | Separately labels first publication and edition publication, and exposes format, language, publisher, ISBN, editions, and reading-state actions | The live user-added record displayed `first pub 1979` but `Edition Pub Date: 19 Jan 1965`; separate labels do not guarantee coherent evidence |
| [Open Library](https://openlibrary.org/works/OL893414W/Dune) | Work description, subjects, many editions, edition bibliography, lists, preview/borrow, and nearby-library continuation | The live work URL defaulted to the French *Le cycle de Dune* edition with 1980 edition facts; aggregated records can mix locale/edition context and public display does not imply reusable rights |
| [Google Books](https://books.google.com/books/about/Dune.html?id=v_P2DwAAQBAJ) | Strong bibliographic block, description, alternate editions, library/seller continuation, and a screen-reader accessibility-mode link | Edition varies by volume ID; the live legacy page retained a desktop-width layout and horizontal scrolling at 390px; API branding, caching, and content terms constrain reuse |
| [Apple Books](https://books.apple.com/us/book/dune/id597944491) | Compact synopsis, editorial framing, edition facts, series, and related continuation | Store-specific price, rating, and editorial content should not become catalog truth |
| [Kobo](https://www.kobo.com/us/en/ebook/dune-2) | Exact digital-edition facts, accessibility metadata, preview, series, and acquisition path | Retail availability and DRM/file facts are product-specific and volatile |

The reusable pattern is not maximum density. It is:

1. stable work identity and creator recognition;
2. a concise, trustworthy description;
3. explicit work-versus-edition labels;
4. a compact edition block;
5. alternate-edition access when it is meaningful; and
6. one or two real continuation actions.

### Cross-product pattern comparison

| Concern | Observed product pattern | Bukie implication |
|---|---|---|
| Information hierarchy | All six lead with cover, title, and creator; Apple/Kobo keep a compact edition block while Goodreads/Open Library expose more secondary sections | Preserve the current primary hierarchy and progressively disclose eligible facts |
| Cover treatment | Large portrait imagery anchors identity; retail pages assume a specific product, while community/library pages may aggregate editions | Show an edition cover only after matching it to the selected edition; otherwise use an explicit work-representative asset or placeholder |
| Description | Every evidence-rich example makes a synopsis prominent, sometimes mixing publisher, editorial, or community copy | Keep one provenance-classed description and do not combine text classes |
| Work versus edition | StoryGraph uses separate first/edition date labels but the live values contradicted one another; Open Library exposes a work plus many editions and defaulted to a French edition; retailer pages mostly describe one sellable edition | Use separate `First published` and `Published` labels, then independently enforce identity, provenance, and internal coherence |
| Continuation | Editions, preview, borrow, buy, save, library, series, and related-book paths are common | Render only a stable path Bukie actually supports; do not imitate unavailable account or commerce actions |
| Missing data | Sparse records generally collapse unavailable facts, although aggregated pages may leave uneven or ambiguous sections | Omit empty sections and punctuation; never use a famous work fact as an edition fallback |
| Mobile | Goodreads, StoryGraph, Open Library, Apple Books, and Kobo reorganized into usable narrow layouts at 390px; Google Books retained its desktop columns and horizontal overflow. Bukie's live *Dune* page stacked cleanly with no horizontal overflow | Preserve semantic reading order, and still validate the required 320px fixture rather than assuming 390px success is sufficient |
| Accessibility | Products expose named links/actions, Kobo publishes detailed edition accessibility metadata, and Google Books offers a screen-reader mode; this study did not audit any competitor for WCAG conformance | Treat competitor accessibility as inspiration only and retain Bukie's own heading, focus, target, contrast, alt-text, and motion requirements |
| Clutter | Goodreads and Open Library are information-dense; Apple and Kobo group content clearly but add commerce; StoryGraph adds tracking/community controls; Google Books is sparse yet visually dated and poorly responsive | Prefer a concise work summary, one edition block, and at most two useful continuation actions |

## Source and licensing decision matrix

`Primary` means suitable to win a field after a source policy and field-specific
checks. `Candidate` means it may create observations but cannot win without
corroboration or review. `Research only` means it must not enter the public
resolution path.

| Source | Useful fields | Fixed-sample signal | Rights and operations | Recommendation |
|---|---|---|---|---|
| Bukie editorial | Corrections and original summaries | Available for all works | Bukie owns its text; reviewer and evidence still required | Primary |
| Official publisher/author | Selected-edition facts, synopsis, cover, series | Matching public pages found for 4/5 modern-sample works | Public HTML is not a bulk-use license; retention, transformations, attribution, and withdrawals require explicit policy or contract | Primary facts after approval; text/assets pending rights |
| Open Library metadata | Work/edition IDs, dates, contributors, subjects, ISBNs | Matching work records found 5/5; *Dune* exact query ranked the desired work below ambiguous results | Human-facing API is low-volume; bulk use should use monthly dumps; cache and identify clients; contributed content has no blanket new license | Candidate; corroborate identity and field |
| Open Library descriptions | Synopsis candidates | Uneven | Content can retain third-party rights despite platform availability | Research/review only until text policy |
| Open Library Covers | Cover discovery | Cover candidates found 5/5 | Covers API says not to crawl and favors direct display; non-OLID/CoverID access is more restricted; rights and Bukie's private transformed cache need separate approval | Candidate only; no automatic cached public winner |
| Wikidata | Work identifiers, inception/publication candidates, language, series | Title search found plausible work entities 5/5, but *Dune* was highly ambiguous and some work entities contain edition-like claims | Structured main-namespace data is CC0; WDQS is not for fuzzy search or large bulk results | Primary candidate for work facts, with entity matching and conflict checks |
| Wikipedia | Research synopsis and citations | English articles found 5/5 | Text is CC BY-SA; attribution, share-alike, copying, spoiler, and drift risks apply | Research only by default |
| Library of Congress and national libraries | Authority IDs, creator/work corroboration, publication history | Major-work catalog coverage is plausible; the public JSON API is not the full catalog and was not used to claim 5/5 machine coverage | LOC offers public interfaces and bulk MARC through 2014, but generally cannot grant rights to collection content | Candidate authority source; no cover/text assumption |
| WorldCat/OCLC | Edition identity and library continuation | Matching public catalog pages inspected for *Dune* and *Born a Crime* | Public pages are not a bulk-data license; API/data use requires the applicable OCLC terms | Manual corroboration or licensed adapter only |
| Google Books API | Volume IDs, edition bibliography, preview links | Web volume pages found for most sample works; five live unauthenticated API attempts returned HTTP 429 | API identification, project quota, branding, links, caching, third-party-content rights, and termination deletion apply | Pending legal/operational approval; do not persist by default |
| Bowker/Books In Print | ISBN-centric edition facts | Access not available; 0/5 verified directly | Commercial quote and contract; retention/display scope and geography must be negotiated | Optional paid primary source, pending business case |
| Project Gutenberg | Public-domain transcription and continuation | 1/5 (*Moby-Dick*) | Automation should use mirrors/feeds rather than the human site; US copyright status does not settle other jurisdictions | Primary for its specific public-domain edition after geography policy |
| Standard Ebooks | Curated public-domain edition, summary, and cover | 1/5 (*Moby-Dick*) | Project work is dedicated to CC0, with US public-domain caveats; production feed access requires approval | Strong source for eligible public-domain editions after access/geography review |
| Competitor and retailer pages | Presentation research | Broad | Product content, ratings, prices, and reviews are not catalog feed inputs | Benchmark only; never scrape into projections |

### Source evidence

- Open Library describes its
  [API](https://openlibrary.org/developers/api) as human-facing and low-volume,
  asks clients to identify themselves and cache, publishes separate
  [monthly dumps](https://openlibrary.org/developers/dumps) for bulk use, and
  documents content caveats in its
  [licensing guidance](https://openlibrary.org/developers/licensing).
- The [Covers API](https://openlibrary.org/dev/docs/api/covers) says not to
  crawl the service and recommends direct source URLs for public display.
- Google documents
  [Books API access](https://developers.google.com/books/docs/v1/using),
  [volume fields](https://developers.google.com/books/docs/v1/reference/volumes),
  [branding requirements](https://developers.google.com/books/branding), and
  the wider [API terms](https://developers.google.com/terms). Quotas are
  project-specific and must be checked rather than hard-coded from a blog post.
- Wikidata's structured data is
  [CC0](https://www.wikidata.org/wiki/Wikidata:Licensing), while its
  [data-access guidance](https://www.wikidata.org/wiki/Help:Data_access)
  distinguishes search/entity access, WDQS, and bulk dumps.
- Wikipedia reuse follows the Wikimedia
  [Terms of Use](https://foundation.wikimedia.org/wiki/Terms_of_Use) and
  CC BY-SA obligations, unlike Wikidata's structured main namespace.
- LOC documents the limits of its
  [JSON/YAML API](https://www.loc.gov/apis/json-and-yaml/) and notes that it
  generally does not own rights in collection material in its
  [rights guidance](https://www.loc.gov/collections/guide-records/about-this-collection/rights-and-access/).
- The official US ISBN agency explains that ISBNs distinguish
  [formats and language editions](https://www.isbn.org/faqs_general_questions);
  Bowker markets [Books In Print data](https://www.bowker.com/bowker-book-data)
  under commercial licensing.
- Project Gutenberg publishes
  [automation and jurisdiction terms](https://www.gutenberg.org/policy/terms_of_use.html).
  Standard Ebooks explains its
  [CC0/public-domain approach](https://standardebooks.org/about), controlled
  [feed access](https://standardebooks.org/feeds), and
  [cover proof and quality workflow](https://standardebooks.org/contribute/how-tos/how-to-choose-and-create-a-cover-image).

### Fixed-sample source evidence

The 4/5 official-publisher signal is work coverage, not proof that the page
matches Bukie's current selected edition. Current product pages were found for
[*Dune*](https://www.penguinrandomhouse.com/books/352036/dune-movie-tie-in-by-frank-herbert/9780143111580/),
[*The City and the Stars*](https://www.hachette.co.uk/titles/arthur-c-clarke/the-city-and-the-stars/9781857987638/),
[*Born a Crime*](https://www.penguinrandomhouse.com/books/537515/born-a-crime-by-trevor-noah/),
and
[*Faithful Place*](https://www.penguinrandomhouse.com/books/304337/faithful-place-by-tana-french/9781101190265/).
Those pages support manual candidate evidence only until their field and usage
policies are approved.

For *Moby-Dick*, both
[Project Gutenberg](https://www.gutenberg.org/ebooks/28794) and
[Standard Ebooks](https://standardebooks.org/ebooks/herman-melville/moby-dick)
expose a specific public-domain digital edition. Neither is evidence for an
arbitrary modern print edition. No public publisher page was counted for that
work.

### Provider operations matrix

`Pending` means no adapter may create a public winner. Numeric limits are
recorded only when the current official documentation states them.

| Source | Identifier and matching | Attribution | Cache, transformation, retention | Quota and refresh | Pricing and withdrawal |
|---|---|---|---|---|---|
| Bukie editorial | Internal work/edition ID plus cited parent evidence | Internal editor/reviewer audit | Retain versioned original text and observations; transformations are new reviewed revisions | Project-scheduled | Contributor/reviewer time; supersede or withdraw through a tombstone and new resolution |
| Official publisher/author | Prefer exact ISBN/product URL; title/author creates only a candidate | Contract or page-specific policy | No bulk cache, transformation, or indefinite retention by default | No scraper; use an approved feed cadence or manual curation | Usually quote/relationship-based; contract must define takedown and purge |
| Open Library metadata | OLID, ISBN, and explicit work/edition relations; fuzzy results remain candidates | Courtesy backlink requested | Cache is requested operationally, but content retention and field rights still require policy; monthly dump revisions are identifiable | Current API guidance states about 1 request/second by default and 3/second for identified clients; use monthly dumps for bulk refresh | No API fee stated; withdrawal/policy suspension recomputes affected heads |
| Open Library Covers | CoverID/OLID/ISBN improves lookup but does not prove rights or Bukie's selected edition | Courtesy backlink requested | Public direct URLs are recommended; crawling and Bukie's private transformed cache are not approved by default | Non-CoverID/OLID access currently has a documented 100 requests per 5 minutes per IP limit; refresh only on approved asset schedule | No fee stated; takedown or policy change purges cached derivatives when required |
| Wikidata | QID, stated identifiers, claims, qualifiers, and references; ambiguous title search never activates a link | Structured main-namespace data is CC0; retain source provenance even though attribution is not a CC0 condition | Structured facts may be normalized and retained under CC0; do not treat Wikipedia sitelinks as the same license | Entity/search access for bounded updates; dumps for bulk; WDQS is not a fuzzy/bulk pipeline | No access fee stated; revision or deletion creates a new observation/tombstone and reruns resolution |
| Wikipedia | Page and revision IDs identify prose, not book editions | CC BY-SA attribution and share-alike requirements | Reuse/adaptation would need a compliant product design; default policy rejects public description ingestion | Not scheduled because public ingestion is rejected | No access fee; remove cached text if a future policy is suspended or rights change |
| LOC/national libraries | LCCN/control number, authority ID, ISBN, and MARC/BIBFRAME relations | Preserve institution/record attribution where required | Record metadata and collection content need separate rights review; no cover/text assumption | LOC JSON API is rate-limited and not the full catalog; use the appropriate catalog/bulk interface and version | Public access, with operational cost only; withdrawal follows institution and Bukie policy |
| WorldCat/OCLC | OCLC number, ISBN, and edition catalog record | Applicable OCLC attribution/terms | Public-page inspection grants no bulk cache or transformation rights | No adapter until licensed access, quota, and refresh terms are recorded | Contract-dependent; purge/disable behavior must be negotiated |
| Google Books | Volume ID plus ISBN; a volume is edition-like but still requires tuple validation | Required branding, links, and attribution | Cache only as permitted by response headers/terms; third-party content and transformations need rights; termination can require deletion | Project-console quota; five unauthenticated sample calls returned 429, so no fixed usable quota was assumed | Check current project billing/terms; delete retained permitted content when terms require |
| Bowker/Books In Print | ISBN is strong edition identity; work grouping still needs evidence | Contract-dependent | Retention, display, derivatives, and geography are contract-dependent | Licensed update feed/cadence | Quote required; contract must specify termination and purge |
| Project Gutenberg | Gutenberg ebook ID identifies its digital edition; work link requires matching | Follow Project Gutenberg license/trademark terms and retain provenance | Use mirrors/offline feeds for automation; reuse depends on the reader's jurisdiction, not only US status | Human site discourages high-volume automation; refresh from approved feeds | No content fee; geography or rights conflict makes the value ineligible and purgeable |
| Standard Ebooks | Canonical ebook/repository identity plus documented text basis | CC0 does not require attribution, but Bukie retains source provenance | CC0 project contributions permit reuse/transformations subject to jurisdiction caveats | OPDS/production feed access requires project approval; refresh by released revision | No listed per-record fee, but access/sponsorship may apply; geography or project correction triggers re-resolution |

## Coverage and field recommendations

### Work and edition identity

Use a staged matcher:

1. exact normalized ISBN for an edition;
2. provider-native work/edition IDs already linked to the entity;
3. a strong edition tuple such as publisher, format, language, and full date;
4. normalized title plus ordered creator as a work candidate only; and
5. human review for ambiguity, adaptations, translations, or conflicting
   candidate works.

Title-only matches never create an active entity link. A work relation from a
provider does not prove that every returned cover or bibliographic fact belongs
to Bukie's selected edition.

Open Library public search found a plausible record for all five fixed works,
but *Dune* demonstrated that a naïve title/author search can rank the desired
work below films and other same-title entities. Wikidata likewise covered all
five but returned the *Dune* novel behind unrelated same-title entities. Both
support candidate generation, not blind resolution.

### Publication dates

Approve a new work fact with the same partial-date semantics already used for
editions:

- `works.first_publication_date`
- `works.first_publication_precision`
- `works.first_publication_sort_date`
- field key `work.first_publication_date`

The fact is nullable and resolved through work-level observations. Do not seed
it by copying `editions.publication_date`. A year-only source remains
year-precision. Conflicting years are omitted until resolved.

Reader-facing and machine-facing meanings:

| Context | Work fact | Selected-edition fact |
|---|---|---|
| UI label | `First published 1965` | `Published 4 June 2019` |
| Placement | Near creator/category context | Inside Book details |
| Missing/conflicting | Omit | Omit |
| Schema.org | Work-level `Book.datePublished` | `workExample.datePublished` |

Schema.org defines
[`datePublished`](https://schema.org/datePublished) as first publication for a
creative work and supports edition-like examples through
[`workExample`](https://schema.org/workExample). The exact JSON-LD change still
belongs in the implementation issue and must preserve the current eligibility
contract.

### Covers

Cover selection is an asset-resolution problem, not a URL preference.

Required public winner gates:

- active, approved source record and asset-display policy;
- exact edition match, or an explicitly approved work-representative asset;
- retained rights basis, attribution, retrieval time, and source URL;
- successful decode and allowed media type;
- recorded width, height, bytes, checksum, and object key;
- no adaptation, translation, abridgement, movie-tie-in, or locale conflict
  unless Bukie's selected edition has the same identity;
- minimum effective resolution for the rendered slot and a sensible portrait
  crop; and
- no withdrawal or superseding rights event.

Aesthetic or resolution ranking happens only after those gates. Automated
checks can flag square canvases, white sidebars, tiny images, extreme aspect
ratios, duplicates, and corrupt files. A reviewer decides ambiguous identity,
adaptations, and transformations. The current *Dune* and *Moby-Dick* covers
would enter that queue rather than remain automatic winners.

### Descriptions

Allow exactly three production classes:

1. **Licensed verbatim:** an approved source permits storage and display of the
   exact text. Retain the license basis, attribution, source revision, and
   withdrawal behavior. Do not summarize or translate unless the license
   permits derivatives.
2. **Bukie editorial:** an original 80–140 word neutral summary written from
   approved evidence. Retain editor, reviewer, claim references, reason, and
   revision history.
3. **Model-assisted candidate:** generated only from approved evidence and
   stored as a derived observation with model/version, prompt-template version,
   parent observation IDs, generation time, and cost telemetry. It is never
   public merely because generation succeeded.

Wikipedia prose is not a default description feed. Wikidata facts may be
approved independently because their main structured namespace has different
licensing.

Model-assisted candidates must pass:

- every factual claim maps to at least one eligible parent observation;
- no unresolved contradiction with title, creator, edition, or work identity;
- no plot outcome beyond the inciting premise and a spoiler checklist;
- neutral, non-promotional tone and no invented comparison or rating language;
- 80–140 words and an accessibility/readability review;
- copying heuristics, including a warning at an exact eight-word source match,
  followed by human judgment rather than treating the heuristic as legal proof;
- human review for every initial candidate, every ambiguous identity, weak or
  conflicting evidence, similarity warning, sensitive living-person content,
  and each new source/model/prompt policy version.

Third-party or model quality scores are advisory observations only. They cannot
override evidence, rights, or human-review gates.

### Edition facts, creators, categories, and series

Exact-edition facts should come from an approved publisher, ISBN-centric
licensed feed, or strongly linked library/provider edition. Page count, format,
publisher, language, and ISBN must all belong to the same edition; do not build
a synthetic “best” edition from different records.

Work-level creator and series relations can be reconciled across independent
work sources, with ordered roles retained. Broad external subjects should map
to Bukie's controlled categories only through an explicit reviewed mapping.
Provider genre lists must not silently create reader-facing categories.

### Continuation

The current category link is a valid browse continuation. A future detail page
may add only destinations that are real, stable, and policy-approved:

- `Other editions` when distinct, eligible editions exist;
- `Preview` for an eligible provider-specific preview;
- `Read` for an eligible public-domain edition;
- `Find at a library` through a stable licensed/public catalog link; or
- a future authenticated library action after its own dependency is complete.

Do not render dead controls, generic retailer searches, ratings/reviews, or
recommendations under #130.

## Scalable enrichment pipeline

```text
approved source policy
        ↓
rate-limited adapter or versioned bulk snapshot
        ↓
source record + immutable raw/normalized observations
        ↓
identity matcher → unmatched/candidate/active link
        ↓
field resolver → identity and rights hard gates
        ↓
automated quality checks → bounded human review queue
        ↓
eligible resolution head → reader/API/metadata/JSON-LD projections
```

### Adapter contract

Each adapter declares:

- source-policy version and allowed fields;
- acquisition mode, attribution, cache/retention, transformation, and
  withdrawal rules;
- credential and quota configuration without secrets in logs;
- per-host concurrency, minimum interval, retry ceiling, exponential backoff,
  jitter, and `Retry-After` handling;
- conditional retrieval and snapshot/revision identity;
- normalized provider work/edition IDs and raw-payload retention permission;
- deterministic observation keys; and
- metrics for requests, latency, cache hits, status codes, retries, bytes, and
  provider revision age.

API defaults must be configuration, not assumptions. Open Library currently
documents low-volume human-facing limits and directs bulk users to dumps;
Google quota depends on the project. A provider can be disabled without
changing entity or field schemas.

### Determinism and idempotency

Use an immutable run manifest containing source snapshot/revision, policy
version, adapter version, resolver version, input entity scope, and content
hash. Observation identity should include source, source-record revision,
entity, field, and normalized value hash. Retrying the same run must not create
new logical observations or different winners.

The same fixtures and resolution ordering must pass in SQLite and Postgres.
Provider order, network timing, and database row order must not affect a
winner.

### Dry run and write isolation

A catalog-wide dry run:

- reads the current catalog and approved external snapshots;
- writes only to a disposable database/schema or run artifact;
- never updates current resolution heads, projections, asset pointers, or
  reader-visible routes;
- reports proposed matches, observations, winners, omissions, conflicts,
  review reasons, rights blocks, withdrawals, and projected coverage delta;
- can be rerun from the same manifest and compared byte-for-byte after stable
  ordering; and
- produces no generated description or downloaded asset when its source policy
  forbids that dry-run retention.

Promotion is a separate reviewed action. It applies an approved run manifest
transactionally, retains the prior heads, and can restore them without deleting
observation history.

### Human-review queue

Queue only cases where judgment changes eligibility:

- ambiguous work or edition match;
- cover adaptation/locale/edition uncertainty;
- source conflict above the field threshold;
- description copying, spoiler, sensitivity, or evidence warning;
- category/series mapping not yet approved; and
- rights or withdrawal exceptions.

Prioritize by hard-risk severity, reader-value weight, number of affected works,
and age. Deduplicate cases that share the same candidate source record or
asset. A queue cap pauses the affected adapter or leaves lower-priority facts
unresolved; it never auto-approves overflow.

### Observability and rollback

Per run and provider, retain:

- scanned, matched, ambiguous, unmatched, observed, proposed, promoted,
  omitted, conflicting, stale, withdrawn, and review-queued counts;
- coverage before/after by field and confidence band;
- API latency, throttles, retries, failures, cache hits, bytes, and snapshot age;
- asset decode, dimension, checksum, and identity-gate failures;
- model token/cost, claim, copying, spoiler, and reviewer outcomes; and
- resolver/policy versions for every proposed head.

Alert on a provider's match-rate collapse, conflict spike, rights-policy
change, repeated 429/5xx responses, or review queue cap. Withdrawal creates a
tombstone, makes the affected observation ineligible, recomputes the head, and
purges cached payloads/assets when policy requires. Rollback selects the prior
eligible resolution set and matching deployment; it does not rewrite history.

## Operational scorecard

This aspect-level planning score uses the feasibility definition above.

| Aspect | Reader | Source | Rights | Automation | Scale | Maintain | Freshness |
|---|---:|---:|---:|---:|---:|---:|---:|
| Cover identity | 5 | 4 | 2 | 2 | 3 | 2 | 2 |
| Cover quality | 4 | 5 | 2 | 5 | 5 | 4 | 4 |
| Description | 5 | 4 | 2 | 2 | 3 | 2 | 3 |
| Work first publication | 4 | 5 | 4 | 4 | 5 | 4 | 5 |
| Edition publication | 4 | 4 | 4 | 4 | 4 | 3 | 3 |
| Edition facts | 5 | 4 | 4 | 4 | 4 | 3 | 3 |
| Creator/category/series | 4 | 4 | 4 | 3 | 4 | 3 | 4 |
| Hierarchy/continuation | 4 | 5 | 5 | 5 | 5 | 4 | 4 |

The best first data gain is work first publication: high coverage, durable
reader value, work-level semantics, and favorable licensing through Wikidata
facts. Covers and descriptions have higher reader value but substantially
higher identity, rights, review, and withdrawal costs.

## 500-work planning envelope

These estimates are suitable for issue sizing, not procurement.

| Area | Expected eligible coverage after first pass | Machine runtime | Human effort | Direct-cost note |
|---|---:|---:|---:|---|
| Work first publication | 90–98% | 20–60 minutes by approved API, or 1–4 hours from prepared dumps | 2–6 hours on conflicts/ambiguity | Usually infrastructure-only for open sources |
| Selected-edition facts | 60–80% | 30–120 minutes | 8–20 hours where identifiers are weak | Commercial ISBN data requires a quote |
| Verified covers | 45–70%; 75–90% only with a suitable licensed feed | 1–3 hours including decode/checksum/quality checks | 3–15 hours for roughly 150–300 flagged candidates | Storage/compute is small; asset rights dominate |
| Publishable descriptions | 35–55% from licensed/editorial/PD paths; 70–85% may reach candidate status with a model | 1–4 hours plus provider throttling | 25–67 hours if every final summary is reviewed; lower only after an approved sampling policy | Model planning envelope $0.02–$0.20 per candidate, or about $10–$100 for 500; review dominates |
| Creators/series/category mapping | 75–95% creators; lower for reviewed category/series mappings | 30–90 minutes | 5–15 hours | Mostly policy and review cost |

Expected initial review queues are 20–35% of works for identity/edition
ambiguity and 40–60% of description candidates for rights or editorial review.
The pipeline must stop short of its target coverage rather than bypass a gate.

## Recommended detail hierarchy

### Evidence-rich desktop

```text
┌──────────────┐  Dune
│ verified     │  by Frank Herbert
│ edition      │  Science Fiction · First published 1965
│ cover        │
└──────────────┘  About
                  [eligible 80–140 word description]

                  Book details
                  Published 4 June 2019
                  Paperback · 688 pages
                  Ace · English
                  ISBN 978…

                  [Other editions]  [approved continuation]
```

### Evidence-rich mobile

```text
[centered verified cover]
Dune
by Frank Herbert
Science Fiction
First published 1965

About
[description]

Book details
Published 4 June 2019
Paperback · 688 pages
Ace · English
ISBN 978…

[Other editions]
[approved continuation]
```

### Sparse evidence

```text
[placeholder or eligible cover]
Title
by stored creator
[stored category]

[Only eligible facts render]
[One real continuation, if available]
```

There are no empty `About` or `Book details` panels, em dashes, guessed dates,
or disabled actions. On narrow screens the information order stays title,
creator, context, description, edition facts, and continuation. Existing
heading semantics, visible focus, 44×44 touch targets, reduced motion, contrast,
and alt-text rules in the design system remain binding.

## Sequenced implementation slices

No slice starts until this strategy is reviewed. Each issue should carry the
`Catalog & discovery quality` milestone and its relevant catalog, curation,
architecture, design, or UX labels.

1. [#131](https://github.com/amalv/bukie/issues/131): approve field-specific
   source policies and implement provider-neutral adapter contracts.
2. [#132](https://github.com/amalv/bukie/issues/132): add provenance-resolved
   work first-publication fields with SQLite/Postgres parity and
   structured-data tests.
3. [#133](https://github.com/amalv/bukie/issues/133): add description candidate
   classes and evidence/copying/spoiler/review gates.
4. [#134](https://github.com/amalv/bukie/issues/134): add edition-matched cover
   inspection, asset metadata, rights, and review gates.
5. [#135](https://github.com/amalv/bukie/issues/135): run a reproducible
   catalog-wide dry run and review its coverage/cost report before any
   promotion.
6. [#136](https://github.com/amalv/bukie/issues/136): present eligible enriched
   facts and continuation paths with rich, sparse, desktop, and mobile
   stories/tests.

Ratings and recommendations do not become dependencies of these slices.

## Decision record

Approved by this recommendation:

- a distinct work-level first-publication fact;
- a multi-source provenance pipeline with field-specific policies;
- identity and rights as hard public-display gates;
- three controlled description classes;
- deterministic dry run, review queue, observability, withdrawal, and rollback;
- edition-aware detail hierarchy and omission behavior; and
- narrowly scoped implementation issues that remain blocked on review of #130.

Rejected:

- choosing one provider as universal catalog truth;
- title-only automatic matching;
- relabeling an edition year as first publication;
- scraping competitor, retailer, publisher, or Wikipedia pages into public
  projections;
- treating an available image URL as cover rights or edition identity;
- automatic model-written public summaries without evidence and review gates;
- importing external category lists directly into Bukie's taxonomy; and
- mixing ratings, reviews, popularity, recommendations, or reader actions into
  this research.

Pending:

- legal approval for each Open Library field/asset policy;
- Google Books caching, branding, retention, and third-party-content use;
- publisher feed or page-specific text/asset licenses;
- Bowker scope, pricing, retention, and display rights;
- WorldCat/OCLC data or linking terms for an adapter;
- global public-domain geography policy for Gutenberg/Standard Ebooks; and
- the exact review staffing and promotion threshold after the first dry run.

## Repository references

- [Catalog metadata and provenance ADR](../decisions/0016-catalog-metadata-provenance.md)
- [Database and catalog architecture](../database-architecture.md)
- [Book presentation decision](../design-system/book-presentation.md)
- [Accessibility guidance](../design-system/accessibility.md)
- [Book curation steps](../books-steps.md)
- [Roadmap](../../ROADMAP.md)
- `src/db/catalog/values.ts`
- `src/db/repositories/bookRepository.ts`
- `src/features/books/types.ts`
- `src/features/books/detailPresentation.ts`
- `src/features/books/BookDetails.tsx`
- `src/stories/BookDetails.stories.tsx`
- `scripts/covers/fetch-covers.ts`
