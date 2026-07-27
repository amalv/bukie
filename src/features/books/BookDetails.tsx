import BookOpen from "lucide-react/dist/esm/icons/book-open.js";
import Calendar from "lucide-react/dist/esm/icons/calendar.js";
import User from "lucide-react/dist/esm/icons/user.js";
import Image from "next/image";
import { resolveBookCoverSrc, shouldUnoptimizeImage } from "@/media/covers";
import type { EditionSummary, WorkDetail } from "./types";

export type BookDetailsProps = { work: WorkDetail };

function joinValues(values: string[]): string | undefined {
  return values.length > 0 ? values.join(", ") : undefined;
}

function editionLabel(edition: EditionSummary, work: WorkDetail): string {
  return (
    edition.title ?? [work.title, edition.format].filter(Boolean).join(" — ")
  );
}

export function BookDetails({ work }: BookDetailsProps) {
  const edition = work.preferredEdition;
  const authors = joinValues(work.authors.map((author) => author.name));
  const categories = joinValues(
    work.categories.map((category) => category.label),
  );
  const publishers = joinValues(
    edition?.publishers.map((publisher) => publisher.name) ?? [],
  );
  const languages = joinValues(
    edition?.languages.map((language) => language.label) ?? [],
  );
  const identifier = edition?.identifiers.find((value) => value.isPrimary);
  const coverSrc = resolveBookCoverSrc(edition?.cover?.objectKey);
  const coverAlt = authors
    ? `Cover of ${work.title} by ${authors}`
    : `Cover of ${work.title}`;

  return (
    <article
      className="block bg-[var(--color-background)] px-[var(--spacing-3)] py-[var(--spacing-3)] text-[var(--color-on-background)]"
      aria-labelledby="book-title"
    >
      <div className="mx-auto max-w-[1200px]">
        <a
          href="/"
          className="mb-[var(--spacing-2)] inline-flex items-center gap-[var(--spacing-1)] text-[var(--color-on-surface)] no-underline opacity-90 transition-colors hover:text-[var(--color-primary)] focus-visible:text-[var(--color-primary)]"
        >
          &larr; Back to Library
        </a>
        <div className="grid grid-cols-1 items-start gap-[var(--spacing-3)] md:grid-cols-[auto_1fr] md:gap-[var(--spacing-4)]">
          <div className="relative h-[270px] w-[180px] md:h-[540px] md:w-[360px]">
            <Image
              src={coverSrc}
              alt={coverAlt}
              width={180}
              height={270}
              className="mt-[var(--spacing-2)] h-full w-full rounded-[var(--radius-md)] object-cover shadow-[var(--elevation-1)]"
              unoptimized={shouldUnoptimizeImage(coverSrc)}
              sizes="(max-width: 640px) 40vw, 180px"
            />
          </div>
          <div className="flex flex-col gap-[var(--spacing-3)]">
            <section className="flex flex-col gap-[var(--spacing-1)]">
              <div className="mb-[var(--spacing-2)] flex items-start justify-between gap-[var(--spacing-2)]">
                <div>
                  <h1
                    id="book-title"
                    className="m-0 mb-[var(--spacing-1)] text-[var(--type-xl)] leading-[var(--line-tight)] font-semibold text-[var(--color-on-surface)]"
                  >
                    {work.title}
                  </h1>
                  {authors ? (
                    <p className="m-0 text-[var(--type-md)] text-[var(--color-on-surface)] opacity-80">
                      <User
                        className="inline-block h-4 w-4 opacity-80"
                        aria-hidden="true"
                      />
                      <span className="ml-1.5">by {authors}</span>
                    </p>
                  ) : null}
                </div>
                {work.primaryCategory ? (
                  <span className="rounded-[var(--radius-md)] border border-[color:var(--color-outline)] bg-[var(--color-surface)] px-[var(--spacing-1)] py-[var(--spacing-0-5)] text-[var(--type-xs)] leading-[var(--line-tight)] shadow-[var(--elevation-1)]">
                    {work.primaryCategory.label}
                  </span>
                ) : null}
              </div>
              {edition?.publication || edition?.pages ? (
                <div className="flex flex-wrap items-center gap-[var(--spacing-2)] text-[var(--type-sm)]">
                  {edition.publication ? (
                    <span>
                      <Calendar
                        className="inline-block h-4 w-4 opacity-80"
                        aria-hidden="true"
                      />
                      <span className="ml-1">{edition.publication.date}</span>
                    </span>
                  ) : null}
                  {edition.pages ? (
                    <span>
                      <BookOpen
                        className="inline-block h-4 w-4 opacity-80"
                        aria-hidden="true"
                      />
                      <span className="ml-1">{edition.pages} pages</span>
                    </span>
                  ) : null}
                </div>
              ) : null}
            </section>

            <div className="mt-[var(--spacing-3)] flex flex-col gap-[var(--spacing-3)] md:mt-0">
              {work.description ? (
                <section className="rounded-[var(--radius-lg)] border border-[color:var(--color-outline)] bg-[var(--color-surface)] shadow-[var(--elevation-1)]">
                  <div className="p-[var(--spacing-3)] md:p-[var(--spacing-4)]">
                    <h2 className="m-0 mb-[var(--spacing-2)] text-[var(--type-lg)] font-semibold">
                      About this book
                    </h2>
                    <p className="m-0 text-[var(--type-sm)] leading-[var(--line-relaxed)] opacity-80">
                      {work.description}
                    </p>
                  </div>
                </section>
              ) : null}

              <section className="rounded-[var(--radius-lg)] border border-[color:var(--color-outline)] bg-[var(--color-surface)] shadow-[var(--elevation-1)]">
                <div className="p-[var(--spacing-3)] md:p-[var(--spacing-4)]">
                  <h2 className="m-0 mb-[var(--spacing-2)] text-[var(--type-lg)] font-semibold">
                    Book Details
                  </h2>
                  <dl className="grid grid-cols-1 gap-[var(--spacing-2)] md:grid-cols-2">
                    {authors ? (
                      <Detail label="Authors" value={authors} />
                    ) : null}
                    {categories ? (
                      <Detail label="Categories" value={categories} />
                    ) : null}
                    {edition?.publication ? (
                      <Detail
                        label="Publication date"
                        value={edition.publication.date}
                      />
                    ) : null}
                    {edition?.pages ? (
                      <Detail label="Pages" value={String(edition.pages)} />
                    ) : null}
                    {publishers ? (
                      <Detail label="Publishers" value={publishers} />
                    ) : null}
                    {languages ? (
                      <Detail label="Languages" value={languages} />
                    ) : null}
                    {identifier ? (
                      <Detail
                        label={identifier.scheme.toUpperCase()}
                        value={identifier.displayValue ?? identifier.value}
                      />
                    ) : null}
                  </dl>
                </div>
              </section>

              {work.editions.length > 1 ? (
                <section className="rounded-[var(--radius-lg)] border border-[color:var(--color-outline)] bg-[var(--color-surface)] p-[var(--spacing-3)] shadow-[var(--elevation-1)] md:p-[var(--spacing-4)]">
                  <h2 className="m-0 mb-[var(--spacing-2)] text-[var(--type-lg)] font-semibold">
                    Editions
                  </h2>
                  <ul className="m-0 list-disc pl-[var(--spacing-3)]">
                    {work.editions.map((item) => (
                      <li key={item.id}>
                        {editionLabel(item, work)}
                        {item.publication ? ` (${item.publication.date})` : ""}
                      </li>
                    ))}
                  </ul>
                </section>
              ) : null}
            </div>
          </div>
        </div>
      </div>
    </article>
  );
}

function Detail({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="mb-[var(--spacing-0-5)] text-[var(--type-sm)] font-semibold">
        {label}:
      </dt>
      <dd className="m-0 text-[var(--type-sm)] opacity-80">{value}</dd>
    </div>
  );
}
