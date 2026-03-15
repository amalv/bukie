export function BookCardSkeleton() {
  return (
    <div className="book-card-skeleton flex h-full flex-col overflow-hidden rounded-[var(--radius-md)] border border-[color:var(--color-outline)] bg-[var(--color-surface)] shadow-[var(--elevation-1)]">
      <div className="h-44 w-full bg-[#eee] sm:h-[196px] md:h-[220px] xl:h-[240px]" />
      <div className="flex flex-col gap-[var(--spacing-1)] p-[var(--spacing-1-5)]">
        <div className="mb-[var(--spacing-0-5)] h-[1.2em] w-[80%] rounded-[var(--radius-sm)] bg-[#e0e0e0]" />
        <div className="mb-[var(--spacing-0-5)] h-[1.2em] w-[60%] rounded-[var(--radius-sm)] bg-[#e0e0e0]" />
      </div>
    </div>
  );
}
