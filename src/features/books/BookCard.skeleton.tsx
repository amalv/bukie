export function BookCardSkeleton({
  presentation = "grid",
}: {
  presentation?: "grid" | "compact";
}) {
  const isCompact = presentation === "compact";

  return (
    <div
      aria-hidden="true"
      className={[
        "book-card-skeleton flex h-full rounded-[var(--radius-md)] border border-[color:var(--color-outline)] bg-[var(--color-surface)] shadow-[var(--elevation-1)]",
        isCompact ? "min-h-[132px] flex-row sm:min-h-[144px]" : "flex-col",
      ].join(" ")}
      data-presentation={presentation}
    >
      <div
        className={[
          "shrink-0 bg-[var(--color-overlay)]",
          isCompact
            ? "h-[132px] w-[88px] rounded-l-[var(--radius-md)] sm:h-[144px] sm:w-[96px]"
            : "w-full rounded-t-[var(--radius-md)] aspect-[2/3]",
        ].join(" ")}
      />
      <div
        className={[
          "flex min-w-0 flex-1 flex-col gap-[var(--spacing-1)] p-[var(--spacing-1-5)]",
          isCompact ? "justify-center" : "",
        ].join(" ")}
      >
        <div className="h-[1.2em] w-[80%] rounded-[var(--radius-sm)] bg-[var(--color-overlay)]" />
        <div className="h-[1em] w-[60%] rounded-[var(--radius-sm)] bg-[var(--color-overlay)]" />
        <div className="h-[1em] w-[70%] rounded-[var(--radius-sm)] bg-[var(--color-overlay)]" />
      </div>
    </div>
  );
}
