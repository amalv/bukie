import { ThemeToggle } from "@/design/theme/ThemeToggle";

export default function Header() {
  return (
    <header className="fixed inset-x-0 top-0 z-[100] border-b border-[color:var(--color-outline)] bg-[var(--color-background)] text-[var(--color-on-surface)]">
      <div className="flex min-h-14 items-center justify-between px-[var(--spacing-2)]">
        <div>Bukie</div>
        <ThemeToggle />
      </div>
    </header>
  );
}
