import type React from "react";
import styles from "./grid.module.css";

export type GridProps = React.PropsWithChildren<
  Omit<React.HTMLAttributes<HTMLElement>, "children"> & {
    as?: "div" | "ol" | "ul";
    gap?: "none" | "xs" | "sm" | "md" | "lg" | "xl" | "responsive";
  }
>;

export const Grid: React.FC<GridProps> = ({
  as: Component = "div",
  gap: gapKey = "sm",
  className,
  children,
  ...rest
}) => (
  <Component
    {...rest}
    className={[
      styles.grid,
      {
        none: styles.gapNone,
        xs: styles.gapXs,
        sm: styles.gapSm,
        md: styles.gapMd,
        lg: styles.gapLg,
        xl: styles.gapXl,
        responsive: styles.gapResponsive,
      }[gapKey],
      className,
    ]
      .filter(Boolean)
      .join(" ")}
  >
    {children}
  </Component>
);
