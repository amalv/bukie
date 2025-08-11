import type React from "react";
import { container } from "./grid.css";

export type ContainerProps = React.PropsWithChildren<{
  className?: string;
}>;

export const Container: React.FC<ContainerProps> = ({
  className,
  children,
}) => (
  <div className={[container, className].filter(Boolean).join(" ")}>
    {children}
  </div>
);
