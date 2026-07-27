import type { WorkSummary } from "./types";

export type AuthorPresentation = {
  full: string;
  visible: string;
  truncated: boolean;
};

export function presentAuthors(
  work: WorkSummary,
): AuthorPresentation | undefined {
  const names = work.authors
    .map((author) => author.name.trim())
    .filter(Boolean);
  if (names.length === 0) return undefined;
  const visibleNames = names.slice(0, 2);
  const hiddenCount = names.length - visibleNames.length;
  return {
    full: names.join(", "),
    visible:
      hiddenCount > 0
        ? `${visibleNames.join(" · ")} and ${hiddenCount} more`
        : visibleNames.join(" · "),
    truncated: hiddenCount > 0,
  };
}

export function presentBibliographicMeta(
  work: WorkSummary,
): string | undefined {
  const values = [
    work.primaryCategory?.label,
    work.preferredEdition?.publication?.date,
  ].filter((value): value is string => Boolean(value));
  return values.length > 0 ? values.join(" · ") : undefined;
}
