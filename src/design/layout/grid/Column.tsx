import type React from "react";
import styles from "./grid.module.css";
import { type ResponsiveSpan, resolveSpanStyle } from "./helpers";

export type ColumnProps = React.PropsWithChildren<{
  span?: ResponsiveSpan;
  className?: string;
}>;

export const Column: React.FC<ColumnProps> = ({
  span = 12,
  className,
  children,
}) => {
  const style = resolveSpanStyle(span);
  return (
    <div
      className={[styles.column, className].filter(Boolean).join(" ")}
      style={style}
    >
      {children}
    </div>
  );
};
