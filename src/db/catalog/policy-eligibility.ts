type DisplayPolicy = {
  display?: unknown;
  proposedEvidenceOnly?: unknown;
  fieldPermission?: {
    allowedFields?: unknown;
  };
  textPermission?: {
    allowedFields?: unknown;
  };
};

export function sourcePolicyAllowsFieldDisplay(
  policy: string | Record<string, unknown> | null,
  fieldKey: string,
): boolean {
  if (!policy) return false;
  try {
    const value: unknown =
      typeof policy === "string" ? JSON.parse(policy) : policy;
    if (!value || typeof value !== "object" || Array.isArray(value)) {
      return false;
    }
    const parsed = value as DisplayPolicy;
    if (parsed.display !== true || parsed.proposedEvidenceOnly === true) {
      return false;
    }
    const permissionKeys = [
      "fieldPermission",
      "textPermission",
    ] as const satisfies ReadonlyArray<keyof DisplayPolicy>;
    const declaredPermissions = permissionKeys
      .filter((key) => Object.hasOwn(parsed, key))
      .map((key) => parsed[key]);
    if (declaredPermissions.length === 0) return true;
    const allowedFieldLists: string[][] = [];
    for (const permission of declaredPermissions) {
      if (!permission || typeof permission !== "object") return false;
      const allowedFields = permission.allowedFields;
      if (
        !Array.isArray(allowedFields) ||
        !allowedFields.every((allowedField) => typeof allowedField === "string")
      ) {
        return false;
      }
      allowedFieldLists.push(allowedFields);
    }
    return allowedFieldLists.some((allowedFields) =>
      allowedFields.includes(fieldKey),
    );
  } catch {
    return false;
  }
}
