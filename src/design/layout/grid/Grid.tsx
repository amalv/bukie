import type React from "react";
import styles from "./grid.module.css";

export type GridProps = React.PropsWithChildren<{
  gap?: "none" | "xs" | "sm" | "md" | "lg" | "xl";
  className?: string;
}>;

export const Grid: React.FC<GridProps> = ({
  gap: gapKey = "sm",
  className,
  children,
}) => (
  <div
    className={[
      styles.grid,
      {
        none: styles.gapNone,
        xs: styles.gapXs,
        sm: styles.gapSm,
        md: styles.gapMd,
        lg: styles.gapLg,
        xl: styles.gapXl,
      }[gapKey],
      className,
    ]
      .filter(Boolean)
      .join(" ")}
  >
    {children}
  </div>
);
