import type { CSSProperties } from "react";

export type ResponsiveSpan =
  | number
  | {
      base?: number;
      sm?: number;
      md?: number;
      lg?: number;
      xl?: number;
    };

const clamp = (n: number) =>
  (n < 1 ? 1 : n > 12 ? 12 : n) as
    | 1
    | 2
    | 3
    | 4
    | 5
    | 6
    | 7
    | 8
    | 9
    | 10
    | 11
    | 12;

type ColumnVars = CSSProperties & {
  "--col-base"?: string;
  "--col-sm"?: string;
  "--col-md"?: string;
  "--col-lg"?: string;
  "--col-xl"?: string;
};

export const resolveSpanStyle = (span: ResponsiveSpan): ColumnVars => {
  const style: ColumnVars = {};
  if (typeof span === "number") {
    style["--col-base"] = String(clamp(span));
    return style;
  }
  if (span.base != null) style["--col-base"] = String(clamp(span.base));
  if (span.sm != null) style["--col-sm"] = String(clamp(span.sm));
  if (span.md != null) style["--col-md"] = String(clamp(span.md));
  if (span.lg != null) style["--col-lg"] = String(clamp(span.lg));
  if (span.xl != null) style["--col-xl"] = String(clamp(span.xl));
  return style;
};
