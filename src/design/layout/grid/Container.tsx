import type React from "react";
import styles from "./grid.module.css";

export type ContainerProps = React.PropsWithChildren<{
  className?: string;
}>;

export const Container: React.FC<ContainerProps> = ({
  className,
  children,
}) => (
  <div className={[styles.container, className].filter(Boolean).join(" ")}>
    {children}
  </div>
);
