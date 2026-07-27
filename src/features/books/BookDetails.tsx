import BookOpen from "lucide-react/dist/esm/icons/book-open.js";
import Calendar from "lucide-react/dist/esm/icons/calendar.js";
import User from "lucide-react/dist/esm/icons/user.js";
import Image from "next/image";
import type { ReactNode } from "react";
import { resolveBookCoverSrc, shouldUnoptimizeImage } from "@/media/covers";
import {
  detailEvidenceKindLabel,
  detailFieldLabel,
  detailProvenanceStatusLabel,
  editionDisplayLabel,
  groupDetailProvenance,
} from "./detailPresentation";
import type {
  DetailProvenance,
  EditionSummary,
  WorkAuthor,
  WorkDetail,
} from "./types";

export type BookDetailsProps = { work: WorkDetail };

function joinValues(values: string[]): string | undefined {
  return values.length > 0 ? values.join(", ") : undefined;
}

function humanize(value: string): string {
  return value
    .split("_")
    .map((part) => `${part[0]?.toUpperCase() ?? ""}${part.slice(1)}`)
    .join(" ");
}

function creatorLabel(creator: WorkAuthor): string {
  return creator.role === "author"
    ? creator.name
    : `${creator.name} (${humanize(creator.role)})`;
}

function formatEvidenceDate(timestamp: number): string {
  return new Intl.DateTimeFormat("en", {
    dateStyle: "medium",
    timeZone: "UTC",
  }).format(timestamp);
}

function editionFacts(edition: EditionSummary): Array<{
  key: string;
  label: string;
  value: ReactNode;
}> {
  const publishers = joinValues(
    edition.publishers.map((publisher) =>
      publisher.role && publisher.role !== "publisher"
        ? `${publisher.name} (${humanize(publisher.role)})`
        : publisher.name,
    ),
  );
  const languages = joinValues(
    edition.languages.map((language) => language.label),
  );
  return [
    ...(edition.title
      ? [{ key: "title", label: "Edition title", value: edition.title }]
      : []),
    ...(edition.subtitle
      ? [{ key: "subtitle", label: "Subtitle", value: edition.subtitle }]
      : []),
    ...(edition.format
      ? [
          {
            key: "format",
            label: "Format",
            value: humanize(edition.format),
          },
        ]
      : []),
    ...(edition.publication
      ? [
          {
            key: "publication",
            label: "Publication date",
            value: (
              <span className="inline-flex items-center gap-[var(--spacing-1)]">
                <Calendar className="h-4 w-4" aria-hidden="true" />
                {edition.publication.date}
              </span>
            ),
          },
        ]
      : []),
    ...(edition.pages
      ? [
          {
            key: "pages",
            label: "Length",
            value: (
              <span className="inline-flex items-center gap-[var(--spacing-1)]">
                <BookOpen className="h-4 w-4" aria-hidden="true" />
                {edition.pages} pages
              </span>
            ),
          },
        ]
      : []),
    ...(publishers
      ? [{ key: "publishers", label: "Publishers", value: publishers }]
      : []),
    ...(languages
      ? [{ key: "languages", label: "Languages", value: languages }]
      : []),
    ...edition.identifiers.map((identifier) => ({
      key: `identifier:${identifier.id}`,
      label: identifier.scheme === "isbn13" ? "ISBN-13" : "ISBN-10",
      value: identifier.displayValue ?? identifier.value,
    })),
  ];
}

export function BookDetails({ work }: BookDetailsProps) {
  const edition = work.preferredEdition;
  const creatorNames = work.authors.map(creatorLabel);
  const authors = joinValues(creatorNames);
  const cover = edition?.cover;
  const coverSrc = resolveBookCoverSrc(cover?.objectKey);
  const coverAlt = cover
    ? authors
      ? `Cover of ${work.title} by ${authors}`
      : `Cover of ${work.title}`
    : `No cover available for ${work.title}`;
  const preferredFacts = edition ? editionFacts(edition) : [];
  const alternateEditions = work.editions.filter(
    (item) => item.id !== edition?.id,
  );
  const provenanceGroups = groupDetailProvenance(work);

  return (
    <article
      className="block bg-[var(--color-background)] px-[var(--spacing-2)] py-[var(--spacing-3)] text-[var(--color-on-background)] sm:px-[var(--spacing-3)] lg:py-[var(--spacing-4)]"
      aria-labelledby="book-title"
    >
      <div className="mx-auto max-w-[1200px]">
        <a
          href="/"
          data-book-detail-action
          className="mb-[var(--spacing-3)] inline-flex min-h-11 items-center rounded-[var(--radius-sm)] px-[var(--spacing-1)] text-[var(--color-on-surface)] no-underline transition-colors hover:text-[var(--color-primary)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[color:var(--color-primary)] motion-reduce:transition-none"
        >
          &larr; Back to catalog
        </a>

        <div className="grid min-w-0 grid-cols-1 items-start gap-[var(--spacing-4)] md:grid-cols-[minmax(180px,260px)_minmax(0,1fr)] lg:grid-cols-[minmax(240px,320px)_minmax(0,1fr)] lg:gap-[var(--spacing-5)]">
          <figure className="m-0 w-full">
            <div
              className="relative mx-auto aspect-[2/3] w-full max-w-[260px] md:mx-0 lg:max-w-[320px]"
              data-cover-state={cover ? "available" : "missing"}
            >
              <Image
                src={coverSrc}
                alt={coverAlt}
                width={640}
                height={960}
                className="h-full w-full rounded-[var(--radius-md)] object-cover shadow-[var(--elevation-1)]"
                unoptimized={shouldUnoptimizeImage(coverSrc)}
                sizes="(max-width: 767px) min(70vw, 260px), (max-width: 1199px) 260px, 320px"
              />
            </div>
            {!cover ? (
              <figcaption className="mt-[var(--spacing-1)] text-center text-[var(--type-sm)] text-[var(--color-on-surface)] opacity-80 md:text-left">
                Cover not available
              </figcaption>
            ) : null}
          </figure>

          <div className="flex min-w-0 flex-col gap-[var(--spacing-3)]">
            <header className="flex min-w-0 flex-col gap-[var(--spacing-1)]">
              <p className="m-0 text-[var(--type-xs)] font-semibold tracking-[0.08em] text-[var(--color-primary)] uppercase">
                Work
              </p>
              <h1
                id="book-title"
                className="m-0 text-[var(--type-xl)] leading-[var(--line-tight)] font-semibold text-[var(--color-on-surface)]"
              >
                {work.title}
              </h1>
              {authors ? (
                <p className="m-0 flex items-start gap-[var(--spacing-1)] text-[var(--type-md)] text-[var(--color-on-surface)] opacity-80">
                  <User className="mt-1 h-4 w-4 shrink-0" aria-hidden="true" />
                  <span>{authors}</span>
                </p>
              ) : null}
              {work.categories.length > 0 ? (
                <ul
                  className="m-0 flex list-none flex-wrap gap-[var(--spacing-1)] p-0"
                  aria-label="Work categories"
                >
                  {work.categories.map((category) => (
                    <li
                      key={category.id}
                      className="rounded-full border border-[color:var(--color-outline)] bg-[var(--color-surface)] px-[var(--spacing-1)] py-[var(--spacing-0-5)] text-[var(--type-xs)]"
                    >
                      {category.label}
                    </li>
                  ))}
                </ul>
              ) : null}
            </header>

            {work.description ? (
              <section
                className="rounded-[var(--radius-lg)] border border-[color:var(--color-outline)] bg-[var(--color-surface)] p-[var(--spacing-3)] shadow-[var(--elevation-1)] md:p-[var(--spacing-4)]"
                aria-labelledby="about-work-heading"
              >
                <h2
                  id="about-work-heading"
                  className="m-0 mb-[var(--spacing-2)] text-[var(--type-lg)] font-semibold"
                >
                  About this work
                </h2>
                <p className="m-0 text-[var(--type-sm)] leading-[var(--line-relaxed)] text-[var(--color-on-surface)] opacity-80">
                  {work.description}
                </p>
              </section>
            ) : (
              <p className="m-0 rounded-[var(--radius-md)] bg-[color:color-mix(in_srgb,var(--color-surface)_88%,var(--color-primary)_12%)] p-[var(--spacing-2)] text-[var(--type-sm)] text-[var(--color-on-surface)]">
                A description is not available in the catalog for this work.
              </p>
            )}

            {edition && preferredFacts.length > 0 ? (
              <EditionSection
                id="preferred-edition-heading"
                heading="Preferred edition"
                description="Publication-specific details for the edition Bukie currently uses on catalog surfaces."
                facts={preferredFacts}
              />
            ) : (
              <p className="m-0 rounded-[var(--radius-md)] bg-[color:color-mix(in_srgb,var(--color-surface)_88%,var(--color-primary)_12%)] p-[var(--spacing-2)] text-[var(--type-sm)] text-[var(--color-on-surface)]">
                Preferred-edition publication details are not available in the
                catalog.
              </p>
            )}

            {alternateEditions.length > 0 ? (
              <section
                className="rounded-[var(--radius-lg)] border border-[color:var(--color-outline)] bg-[var(--color-surface)] p-[var(--spacing-3)] shadow-[var(--elevation-1)] md:p-[var(--spacing-4)]"
                aria-labelledby="alternate-editions-heading"
              >
                <h2
                  id="alternate-editions-heading"
                  className="m-0 text-[var(--type-lg)] font-semibold"
                >
                  Alternate editions
                </h2>
                <p className="mt-[var(--spacing-1)] mb-[var(--spacing-2)] text-[var(--type-sm)] text-[var(--color-on-surface)] opacity-80">
                  Other stored publication records for this work.
                </p>
                <ul className="m-0 grid list-none gap-[var(--spacing-2)] p-0">
                  {alternateEditions.map((item, index) => {
                    const facts = editionFacts(item);
                    return (
                      <li
                        key={item.id}
                        className="rounded-[var(--radius-md)] border border-[color:var(--color-outline)] p-[var(--spacing-2)]"
                      >
                        <h3 className="m-0 mb-[var(--spacing-1)] text-[var(--type-md)] font-semibold">
                          {editionDisplayLabel(
                            item,
                            `Alternate edition ${index + 1}`,
                          )}
                        </h3>
                        {facts.length > 0 ? (
                          <DetailList facts={facts} />
                        ) : (
                          <p className="m-0 text-[var(--type-sm)] text-[var(--color-on-surface)] opacity-80">
                            No additional publication details are available.
                          </p>
                        )}
                      </li>
                    );
                  })}
                </ul>
              </section>
            ) : null}

            {provenanceGroups.length > 0 ? (
              <section aria-labelledby="metadata-heading">
                <h2
                  id="metadata-heading"
                  className="m-0 text-[var(--type-lg)] font-semibold"
                >
                  About this metadata
                </h2>
                <p className="mt-[var(--spacing-1)] mb-[var(--spacing-2)] text-[var(--type-sm)] text-[var(--color-on-surface)] opacity-80">
                  Review where the displayed catalog facts came from and whether
                  any stored evidence needs attention.
                </p>
                <details className="rounded-[var(--radius-lg)] border border-[color:var(--color-outline)] bg-[var(--color-surface)] shadow-[var(--elevation-1)]">
                  <summary className="flex min-h-11 cursor-pointer items-center rounded-[var(--radius-lg)] px-[var(--spacing-3)] py-[var(--spacing-2)] font-semibold focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[color:var(--color-primary)]">
                    View sources and status
                  </summary>
                  <div className="grid gap-[var(--spacing-3)] border-t border-[color:var(--color-outline)] p-[var(--spacing-3)]">
                    {provenanceGroups.map((group) => (
                      <div key={group.id}>
                        <h3 className="m-0 mb-[var(--spacing-1)] text-[var(--type-md)] font-semibold">
                          {group.label}
                        </h3>
                        <dl className="m-0 grid gap-[var(--spacing-1)]">
                          {group.items.map((item) => (
                            <ProvenanceDetail
                              key={`${item.entityId}:${item.field}`}
                              item={item}
                            />
                          ))}
                        </dl>
                      </div>
                    ))}
                  </div>
                </details>
              </section>
            ) : null}
          </div>
        </div>
      </div>
    </article>
  );
}

function EditionSection({
  id,
  heading,
  description,
  facts,
}: {
  id: string;
  heading: string;
  description: string;
  facts: Array<{ key: string; label: string; value: ReactNode }>;
}) {
  return (
    <section
      className="rounded-[var(--radius-lg)] border border-[color:var(--color-outline)] bg-[var(--color-surface)] p-[var(--spacing-3)] shadow-[var(--elevation-1)] md:p-[var(--spacing-4)]"
      aria-labelledby={id}
    >
      <h2 id={id} className="m-0 text-[var(--type-lg)] font-semibold">
        {heading}
      </h2>
      <p className="mt-[var(--spacing-1)] mb-[var(--spacing-2)] text-[var(--type-sm)] text-[var(--color-on-surface)] opacity-80">
        {description}
      </p>
      <DetailList facts={facts} />
    </section>
  );
}

function DetailList({
  facts,
}: {
  facts: Array<{ key: string; label: string; value: ReactNode }>;
}) {
  return (
    <dl className="m-0 grid grid-cols-1 gap-[var(--spacing-2)] sm:grid-cols-2">
      {facts.map((fact) => (
        <Detail key={fact.key} label={fact.label} value={fact.value} />
      ))}
    </dl>
  );
}

function ProvenanceDetail({ item }: { item: DetailProvenance }) {
  const dateTime = item.evidence
    ? new Date(item.evidence.retrievedAt).toISOString()
    : undefined;
  return (
    <div className="grid gap-[var(--spacing-0-5)] rounded-[var(--radius-sm)] bg-[color:color-mix(in_srgb,var(--color-surface)_88%,var(--color-primary)_12%)] p-[var(--spacing-2)] sm:grid-cols-[minmax(9rem,0.6fr)_minmax(0,1.4fr)] sm:gap-[var(--spacing-2)]">
      <dt className="text-[var(--type-sm)] font-semibold">
        {detailFieldLabel(item.field)}
      </dt>
      <dd className="m-0 text-[var(--type-sm)] text-[var(--color-on-surface)] opacity-80">
        <span>{detailProvenanceStatusLabel(item)}</span>
        {item.evidence ? (
          <>
            {" · "}
            <span>{detailEvidenceKindLabel(item.evidence.kind)}</span>
            {" · "}
            <span>{item.evidence.sourceName}</span>
            {" · retrieved "}
            <time dateTime={dateTime}>
              {formatEvidenceDate(item.evidence.retrievedAt)}
            </time>
          </>
        ) : null}
      </dd>
    </div>
  );
}

function Detail({ label, value }: { label: string; value: ReactNode }) {
  return (
    <div className="min-w-0">
      <dt className="mb-[var(--spacing-0-5)] text-[var(--type-sm)] font-semibold">
        {label}
      </dt>
      <dd className="m-0 text-[var(--type-sm)] text-[var(--color-on-surface)] opacity-80 [overflow-wrap:anywhere]">
        {value}
      </dd>
    </div>
  );
}
