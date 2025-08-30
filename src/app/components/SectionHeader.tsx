import * as s from "../page.css";

interface SectionHeaderProps {
  icon: React.ReactNode;
  title: string;
}

export const SectionHeader: React.FC<SectionHeaderProps> = ({
  icon,
  title,
}) => (
  <header className={s.sectionHeader}>
    <div className={s.sectionTitleRow}>
      {icon}
      <h2 className={s.sectionTitle}>{title}</h2>
    </div>
  </header>
);
