import type React from "react";
import styles from "./grid.module.css";
import { type ResponsiveSpan, resolveSpanStyle } from "./helpers";

export type ColumnProps = React.PropsWithChildren<
  Omit<React.HTMLAttributes<HTMLElement>, "children"> & {
    as?: "div" | "li";
    span?: ResponsiveSpan;
  }
>;

export const Column: React.FC<ColumnProps> = ({
  as: Component = "div",
  span = 12,
  className,
  children,
  style: userStyle,
  ...rest
}) => {
  const style = resolveSpanStyle(span);
  return (
    <Component
      {...rest}
      className={[styles.column, className].filter(Boolean).join(" ")}
      style={{ ...style, ...userStyle }}
    >
      {children}
    </Component>
  );
};
