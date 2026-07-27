import {
  type CatalogQuery,
  serializeCatalogQuery,
} from "@/features/books/catalogQuery";

export type HomeSectionId = "categories" | "new-arrivals" | "all-books";

export type HomeSectionDefinition = {
  id: HomeSectionId;
  label: string;
  userNeed: string;
  rule: string;
  freshness: string;
  emptyMessage: string;
  errorMessage: string;
  continuation: {
    label: string;
    href: string;
  };
};

function catalogHref(query: CatalogQuery): string {
  const params = serializeCatalogQuery(query);
  return params.size > 0 ? `/?${params.toString()}` : "/";
}

export const HOME_SECTIONS: Record<HomeSectionId, HomeSectionDefinition> = {
  categories: {
    id: "categories",
    label: "Browse by Category",
    userNeed: "Choose a subject and continue in a shareable filtered catalog.",
    rule: "Active Bukie catalog categories, ordered A–Z.",
    freshness: "Updates when the curated category map changes.",
    emptyMessage:
      "Categories are still being organized. The complete catalog remains available below.",
    errorMessage:
      "Categories are temporarily unavailable. New Arrivals and All Books are still available.",
    continuation: {
      label: "Browse all books",
      href: "#all-books",
    },
  },
  "new-arrivals": {
    id: "new-arrivals",
    label: "New Arrivals",
    userNeed: "See which books were added to Bukie's catalog most recently.",
    rule: "Preferred-edition catalog dates, newest first—not publication recency or popularity.",
    freshness: "Updates when catalog records are added.",
    emptyMessage:
      "No catalog additions are available yet. Browse the complete catalog instead.",
    errorMessage:
      "New Arrivals are temporarily unavailable. The complete catalog remains available below.",
    continuation: {
      label: "View all new arrivals",
      href: catalogHref({ sort: "added" }),
    },
  },
  "all-books": {
    id: "all-books",
    label: "All Books",
    userNeed: "Browse every work currently available in Bukie's catalog.",
    rule: "The complete catalog, ordered by title A–Z.",
    freshness: "Updates when catalog records are added or corrected.",
    emptyMessage:
      "The catalog does not contain any books yet. Check back after the next catalog update.",
    errorMessage:
      "The complete catalog is temporarily unavailable. Please try again.",
    continuation: {
      label: "Browse all books",
      href: "/",
    },
  },
};

export const NEW_ARRIVALS_PREVIEW_LIMIT = 6;

export function categoryCatalogHref(slug: string): string {
  return catalogHref({ category: slug, sort: "title" });
}

export function sectionContext(definition: HomeSectionDefinition): string {
  return `${definition.rule} ${definition.freshness}`;
}
