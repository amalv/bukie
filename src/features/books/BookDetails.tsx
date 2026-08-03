import BookOpen from "lucide-react/dist/esm/icons/book-open.js";
import Calendar from "lucide-react/dist/esm/icons/calendar.js";
import User from "lucide-react/dist/esm/icons/user.js";
import Image from "next/image";
import type { ReactNode } from "react";
import { resolveBookCoverSrc, shouldUnoptimizeImage } from "@/media/covers";
import { editionDisplayLabel } from "./detailPresentation";
import type { EditionSummary, WorkAuthor, WorkDetail } from "./types";

export type BookDetailsProps = { work: WorkDetail };

type EditionFact = {
  key: string;
  label: string;
  value: ReactNode;
};

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

function editionFacts(edition: EditionSummary): EditionFact[] {
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
            label: "Published",
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
      ? [
          {
            key: "publishers",
            label: edition.publishers.length === 1 ? "Publisher" : "Publishers",
            value: publishers,
          },
        ]
      : []),
    ...(languages
      ? [
          {
            key: "languages",
            label: edition.languages.length === 1 ? "Language" : "Languages",
            value: languages,
          },
        ]
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
  const authors = joinValues(work.authors.map(creatorLabel));
  const cover = work.cover ?? edition?.cover;
  const coverSrc = resolveBookCoverSrc(cover?.objectKey);
  const coverAlt = cover
    ? authors
      ? `Cover of ${work.title} by ${authors}`
      : `Cover of ${work.title}`
    : `No cover available for ${work.title}`;
  const bookFacts = edition ? editionFacts(edition) : [];
  const otherEditions = work.editions
    .filter((item) => item.id !== edition?.id)
    .map((item, index) => ({
      edition: item,
      facts: editionFacts(item),
      fallbackLabel: `Edition ${index + 2}`,
    }))
    .filter((item) => item.facts.length > 0);

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

        <div
          data-book-detail-layout
          className="grid min-w-0 grid-cols-1 items-start gap-[var(--spacing-4)] md:grid-cols-[minmax(180px,260px)_minmax(0,1fr)] lg:grid-cols-[minmax(240px,300px)_minmax(0,1fr)] lg:gap-[var(--spacing-6)]"
        >
          <figure className="m-0 w-full">
            <div
              className="relative mx-auto aspect-[2/3] w-full max-w-[260px] md:mx-0 lg:max-w-[300px]"
              data-cover-state={cover ? "available" : "missing"}
            >
              <Image
                src={coverSrc}
                alt={coverAlt}
                width={640}
                height={960}
                className="h-full w-full rounded-[var(--radius-md)] object-cover shadow-[var(--elevation-1)]"
                unoptimized={shouldUnoptimizeImage(coverSrc)}
                sizes="(max-width: 767px) min(70vw, 260px), (max-width: 1199px) 260px, 300px"
              />
            </div>
            {!cover ? (
              <figcaption className="mt-[var(--spacing-1)] text-center text-[var(--type-sm)] text-[var(--color-on-surface)] opacity-80 md:text-left">
                Cover not available
              </figcaption>
            ) : null}
          </figure>

          <div className="flex min-w-0 flex-col gap-[var(--spacing-3)]">
            <header className="flex min-w-0 flex-col gap-[var(--spacing-1-5)]">
              <h1
                id="book-title"
                className="m-0 text-[clamp(1.75rem,3vw,2.5rem)] leading-[var(--line-tight)] font-semibold text-[var(--color-on-surface)]"
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
                  aria-label="Browse by category"
                >
                  {work.categories.map((category) => (
                    <li key={category.id}>
                      <a
                        href={`/?category=${encodeURIComponent(category.slug)}`}
                        data-book-detail-action
                        className="inline-flex min-h-11 items-center rounded-full border border-[color:var(--color-outline)] bg-[var(--color-surface)] px-[var(--spacing-1-5)] py-[var(--spacing-0-5)] text-[var(--type-sm)] text-[var(--color-on-surface)] no-underline transition-colors hover:border-[color:var(--color-primary)] hover:text-[var(--color-primary)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[color:var(--color-primary)] motion-reduce:transition-none"
                      >
                        {category.label}
                      </a>
                    </li>
                  ))}
                </ul>
              ) : null}
              {work.firstPublication ? (
                <p className="m-0 inline-flex items-center gap-[var(--spacing-1)] text-[var(--type-sm)] text-[var(--color-on-surface)] opacity-80">
                  <Calendar className="h-4 w-4" aria-hidden="true" />
                  <span>First published {work.firstPublication.date}</span>
                </p>
              ) : null}
            </header>

            {work.description ? (
              <section
                className="rounded-[var(--radius-lg)] border border-[color:var(--color-outline)] bg-[var(--color-surface)] p-[var(--spacing-3)] shadow-[var(--elevation-1)] md:p-[var(--spacing-4)]"
                aria-labelledby="about-book-heading"
              >
                <h2
                  id="about-book-heading"
                  className="m-0 mb-[var(--spacing-2)] text-[var(--type-lg)] font-semibold"
                >
                  About the book
                </h2>
                <p className="m-0 text-[var(--type-md)] leading-[var(--line-relaxed)] text-[var(--color-on-surface)] opacity-80">
                  {work.description}
                </p>
              </section>
            ) : null}

            {bookFacts.length > 0 ? (
              <DetailSection
                id="book-details-heading"
                heading="Book details"
                facts={bookFacts}
              />
            ) : null}

            {otherEditions.length > 0 ? (
              <section
                className="rounded-[var(--radius-lg)] border border-[color:var(--color-outline)] bg-[var(--color-surface)] p-[var(--spacing-3)] shadow-[var(--elevation-1)] md:p-[var(--spacing-4)]"
                aria-labelledby="other-editions-heading"
              >
                <h2
                  id="other-editions-heading"
                  className="m-0 mb-[var(--spacing-2)] text-[var(--type-lg)] font-semibold"
                >
                  Other editions
                </h2>
                <ul className="m-0 grid list-none gap-[var(--spacing-2)] p-0">
                  {otherEditions.map(
                    ({ edition: item, facts, fallbackLabel }) => (
                      <li
                        key={item.id}
                        className="rounded-[var(--radius-md)] border border-[color:var(--color-outline)] p-[var(--spacing-2)]"
                      >
                        <h3 className="m-0 mb-[var(--spacing-1)] text-[var(--type-md)] font-semibold">
                          {editionDisplayLabel(item, fallbackLabel)}
                        </h3>
                        <DetailList facts={facts} />
                      </li>
                    ),
                  )}
                </ul>
              </section>
            ) : null}
          </div>
        </div>
      </div>
    </article>
  );
}

function DetailSection({
  id,
  heading,
  facts,
}: {
  id: string;
  heading: string;
  facts: EditionFact[];
}) {
  return (
    <section
      className="rounded-[var(--radius-lg)] border border-[color:var(--color-outline)] bg-[var(--color-surface)] p-[var(--spacing-3)] shadow-[var(--elevation-1)] md:p-[var(--spacing-4)]"
      aria-labelledby={id}
    >
      <h2
        id={id}
        className="m-0 mb-[var(--spacing-2)] text-[var(--type-lg)] font-semibold"
      >
        {heading}
      </h2>
      <DetailList facts={facts} />
    </section>
  );
}

function DetailList({ facts }: { facts: EditionFact[] }) {
  return (
    <dl className="m-0 grid grid-cols-1 gap-[var(--spacing-2)] sm:grid-cols-2">
      {facts.map((fact) => (
        <Detail key={fact.key} label={fact.label} value={fact.value} />
      ))}
    </dl>
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
