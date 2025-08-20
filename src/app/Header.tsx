import { ThemeToggle } from "@/design/theme/ThemeToggle";
import * as s from "./header.css";

export default function Header() {
  return (
    <header className={s.header}>
      <div>Bukie</div>
      <ThemeToggle />
    </header>
  );
}
