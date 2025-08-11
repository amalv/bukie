import { spanClasses } from "./grid.css";

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

export const resolveSpanClasses = (span: ResponsiveSpan): string[] => {
  const classes: string[] = [];
  if (typeof span === "number") {
    classes.push(spanClasses.base[clamp(span)]);
    return classes;
  }
  if (span.base != null) classes.push(spanClasses.base[clamp(span.base)]);
  if (span.sm != null) classes.push(spanClasses.sm[clamp(span.sm)]);
  if (span.md != null) classes.push(spanClasses.md[clamp(span.md)]);
  if (span.lg != null) classes.push(spanClasses.lg[clamp(span.lg)]);
  if (span.xl != null) classes.push(spanClasses.xl[clamp(span.xl)]);
  return classes;
};
