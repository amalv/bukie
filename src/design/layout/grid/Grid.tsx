import type React from "react";
import { gap, grid } from "./grid.css";

export type GridProps = React.PropsWithChildren<{
  gap?: keyof typeof gap;
  className?: string;
}>;

export const Grid: React.FC<GridProps> = ({
  gap: gapKey = "sm",
  className,
  children,
}) => (
  <div className={[grid, gap[gapKey], className].filter(Boolean).join(" ")}>
    {children}
  </div>
);
