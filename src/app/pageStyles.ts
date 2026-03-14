export const pageStyles = {
  hero: "bg-[var(--color-background)] px-0 pt-[var(--spacing-6)] pb-[var(--spacing-6)] text-[var(--color-on-background)]",
  header: "flex flex-col items-center gap-[var(--spacing-1)] text-center",
  title:
    "m-0 text-[clamp(2.25rem,5vw,3rem)] leading-[var(--line-tight)] font-bold text-[var(--color-on-background)]",
  subtitle:
    "m-0 text-[clamp(1rem,2vw,1.125rem)] text-[var(--color-on-surface)] opacity-95",
  searchRow:
    "mt-[var(--spacing-2)] flex w-full justify-center gap-[var(--spacing-1)] px-[var(--spacing-2)]",
  searchBox: "relative w-full min-w-0 flex-1 max-w-[960px]",
  labelWrap: "relative block w-full",
  form: "w-full",
  input:
    "block h-[54px] w-full appearance-none rounded-full border border-[color:var(--color-outline)] bg-[var(--color-surface)] px-[var(--spacing-4)] py-[var(--spacing-1-5)] pl-[calc(var(--spacing-4)+20px)] text-[clamp(0.95rem,1.6vw,1.0625rem)] leading-[var(--line-normal)] text-[var(--color-on-surface)] shadow-[var(--elevation-1)] transition-[box-shadow,border-color] duration-200 ease-out placeholder:text-[var(--color-on-surface)] placeholder:opacity-60 focus:border-[color:var(--color-primary)] focus:shadow-[var(--elevation-2)] focus:outline-none",
  icon: "pointer-events-none absolute top-1/2 left-[var(--spacing-2)] h-5 w-5 -translate-y-1/2 text-[var(--color-on-surface)] opacity-60",
  clearLink:
    "self-center rounded-[var(--radius-sm)] px-[var(--spacing-1)] py-[var(--spacing-0-5)] text-[var(--type-sm)] text-[var(--color-primary)] no-underline transition-colors hover:bg-[var(--color-overlay)] focus-visible:bg-[var(--color-overlay)] focus-visible:outline-none",
  searchMeta:
    "mt-[var(--spacing-1)] text-center text-[var(--type-sm)] text-[var(--color-on-surface)] opacity-75",
  srOnly: "sr-only",
  sectionsNav: "mt-[var(--spacing-2)]",
  sectionDivider:
    "mt-[var(--spacing-2)] border-t border-[color:var(--color-outline)]",
  tabsList:
    "m-0 flex list-none flex-wrap items-center gap-[var(--spacing-1)] p-0",
  tabLink(isCurrent: boolean) {
    return [
      "inline-flex min-h-[44px] items-center justify-center gap-[var(--spacing-0-5)] rounded-full border px-[var(--spacing-2)] py-[calc(var(--spacing-1)-1px)] text-[var(--type-md)] leading-none font-medium no-underline whitespace-nowrap transition-[box-shadow,border-color,transform,background-color,color] duration-150 ease-out",
      isCurrent
        ? "border-[color:var(--color-primary)] bg-[var(--color-primary)] text-[var(--color-on-primary)] shadow-[var(--elevation-1)]"
        : "border-[color:var(--color-outline)] bg-[var(--color-surface)] text-[var(--color-on-surface)] shadow-[var(--elevation-0)] hover:-translate-y-px hover:border-[color:var(--color-primary)] hover:shadow-[var(--elevation-1)] focus-visible:-translate-y-px focus-visible:border-[color:var(--color-primary)] focus-visible:shadow-[var(--elevation-1)] focus-visible:outline-none",
    ].join(" ");
  },
  contentSurface:
    "border-t border-[color:var(--color-outline)] bg-[var(--color-surface)] px-0 pt-[var(--spacing-2)] pb-[var(--spacing-4)] text-[var(--color-on-surface)]",
  sectionHeader:
    "book-section-header mb-[var(--spacing-1)] mt-[var(--spacing-2)] flex min-h-[40px] items-center justify-between gap-[var(--spacing-1)]",
  allBooksHeader:
    "mb-[var(--spacing-1)] mt-[var(--spacing-2)] flex min-h-[40px] items-center justify-between gap-[var(--spacing-1)]",
  booksCount:
    "shrink-0 text-right text-[0.95rem] leading-[var(--line-normal)] text-[var(--color-on-surface)] opacity-90",
  sectionTitleRow: "inline-flex items-center gap-[var(--spacing-1)]",
  sectionTitle:
    "m-0 text-[clamp(1.35rem,2.3vw,1.8rem)] leading-[var(--line-tight)] font-bold text-[var(--color-on-background)]",
  sectionHeaderIcon: "book-section-header-icon text-[var(--color-primary)]",
} as const;
