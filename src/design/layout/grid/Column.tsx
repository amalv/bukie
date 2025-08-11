import type React from "react";
import { type ResponsiveSpan, resolveSpanClasses } from "./helpers";

export type ColumnProps = React.PropsWithChildren<{
  span?: ResponsiveSpan;
  className?: string;
}>;

export const Column: React.FC<ColumnProps> = ({
  span = 12,
  className,
  children,
}) => {
  const spans = resolveSpanClasses(span);
  return (
    <div className={[...spans, className].filter(Boolean).join(" ")}>
      {children}
    </div>
  );
};
