export function normalizeAfter(
  rawAfter: string | string[] | undefined,
): string | undefined {
  if (Array.isArray(rawAfter)) return rawAfter[0] ?? undefined;
  return rawAfter;
}
