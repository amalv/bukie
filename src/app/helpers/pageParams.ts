export function normalizeQ(rawQ: string | string[] | undefined): string {
  if (Array.isArray(rawQ)) return rawQ[0] ?? "";
  return rawQ ?? "";
}

export function normalizeAfter(
  rawAfter: string | string[] | undefined,
): string | undefined {
  if (Array.isArray(rawAfter)) return rawAfter[0] ?? undefined;
  return rawAfter;
}
