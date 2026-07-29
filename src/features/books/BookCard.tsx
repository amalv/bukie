import Image from "next/image";
import Link from "next/link";
import { resolveBookCoverSrc, shouldUnoptimizeImage } from "@/media/covers";
import { presentAuthors, presentBibliographicMeta } from "./presentation";
import type { WorkSummary } from "./types";

export type BookCardProps = {
  work: WorkSummary;
  presentation?: "grid" | "compact";
};

export function BookCard({ work, presentation = "grid" }: BookCardProps) {
  const isCompact = presentation === "compact";
  const authors = presentAuthors(work);
  const bibliographicMeta = presentBibliographicMeta(work);
  const coverSrc = resolveBookCoverSrc(
    work.cover?.objectKey ?? work.preferredEdition?.cover?.objectKey,
  );

  return (
    <article
      className={[
        "group book-card relative flex h-full min-w-0 rounded-[var(--radius-md)] border border-[color:var(--color-outline)] bg-[var(--color-surface)] shadow-[var(--elevation-1)] motion-safe:transition-[box-shadow,transform,border-color] motion-safe:duration-200 motion-safe:ease-out motion-safe:hover:-translate-y-[2px] motion-safe:hover:border-[color:var(--color-primary)] motion-safe:hover:shadow-[var(--elevation-3)]",
        isCompact ? "min-h-[132px] flex-row sm:min-h-[144px]" : "flex-col",
      ].join(" ")}
      data-presentation={presentation}
    >
      <div
        className={[
          "relative shrink-0 overflow-hidden bg-[var(--color-overlay)]",
          isCompact
            ? "h-[132px] w-[88px] rounded-l-[var(--radius-md)] sm:h-[144px] sm:w-[96px]"
            : "w-full rounded-t-[var(--radius-md)] aspect-[2/3]",
        ].join(" ")}
      >
        <Image
          src={coverSrc}
          alt=""
          fill
          sizes={
            isCompact
              ? "(min-width: 640px) 96px, 88px"
              : "(min-width: 1280px) 16vw, (min-width: 1024px) 25vw, (min-width: 640px) 33vw, 50vw"
          }
          className="absolute inset-0 block h-full w-full object-cover object-center motion-safe:transition-transform motion-safe:duration-300 motion-safe:ease-out motion-safe:group-hover:scale-105"
          unoptimized={shouldUnoptimizeImage(coverSrc)}
        />
      </div>
      <div
        className={[
          "flex min-w-0 flex-1 flex-col gap-[var(--spacing-0-5)] p-[var(--spacing-1-5)]",
          isCompact ? "justify-center" : "",
        ].join(" ")}
      >
        <h3 className="m-0 overflow-hidden text-left text-[var(--type-md)] leading-[var(--line-tight)] font-bold text-[var(--color-on-surface)] [display:-webkit-box] [-webkit-box-orient:vertical] [-webkit-line-clamp:2]">
          <Link
            href={`/books/${work.id}`}
            aria-label={`View details for ${work.title}`}
            className="text-inherit no-underline outline-none after:absolute after:inset-0 after:rounded-[var(--radius-md)] focus-visible:text-[var(--color-primary)] focus-visible:after:outline-2 focus-visible:after:outline-offset-2 focus-visible:after:outline-[var(--color-primary)]"
          >
            {work.title}
          </Link>
        </h3>
        {authors ? (
          <p className="m-0 truncate text-left text-[var(--type-sm)] leading-[var(--line-normal)] text-[var(--color-on-surface)]">
            {authors.truncated ? (
              <>
                <span aria-hidden="true">{authors.visible}</span>
                <span className="sr-only">{authors.full}</span>
              </>
            ) : (
              authors.visible
            )}
          </p>
        ) : null}
        {bibliographicMeta ? (
          <p className="m-0 truncate text-left text-[var(--type-xs)] leading-[var(--line-normal)] text-[color:var(--color-on-surface)]">
            {bibliographicMeta}
          </p>
        ) : null}
      </div>
    </article>
  );
}
