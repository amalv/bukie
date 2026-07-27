import { pageStyles as s } from "../pageStyles";

interface SectionHeaderProps {
  id?: string;
  icon?: React.ReactNode;
  title: string;
  description?: string;
  context?: string;
  action?: React.ReactNode;
}

export const SectionHeader: React.FC<SectionHeaderProps> = ({
  id,
  icon,
  title,
  description,
  context,
  action,
}) => (
  <header className={s.sectionHeader}>
    <div className={s.sectionHeaderTop}>
      <div className={s.sectionTitleRow}>
        {icon}
        <h2 className={s.sectionTitle} id={id}>
          {title}
        </h2>
      </div>
      {action ? <div className={s.sectionHeaderAction}>{action}</div> : null}
    </div>
    {description ? <p className={s.sectionDescription}>{description}</p> : null}
    {context ? <p className={s.sectionContext}>{context}</p> : null}
  </header>
);
