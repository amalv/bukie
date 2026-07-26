import { createHash, randomUUID } from "node:crypto";

/**
 * Fixed namespace for Bukie's normalized catalog identities.
 *
 * Changing this value would change every deterministic import identity and is
 * therefore a versioned data migration, not a refactor.
 */
export const BUKIE_CATALOG_NAMESPACE = "62b73afd-f82d-51c5-9785-69f6b80de37e";

function uuidBytes(uuid: string): Buffer {
  const hex = uuid.replaceAll("-", "");
  if (!/^[0-9a-f]{32}$/i.test(hex)) {
    throw new Error(`Invalid UUID namespace: ${uuid}`);
  }
  return Buffer.from(hex, "hex");
}

export function uuidV5(name: string, namespace = BUKIE_CATALOG_NAMESPACE) {
  const digest = createHash("sha1")
    .update(uuidBytes(namespace))
    .update(name, "utf8")
    .digest();
  const bytes = Buffer.from(digest.subarray(0, 16));
  bytes[6] = (bytes[6] & 0x0f) | 0x50;
  bytes[8] = (bytes[8] & 0x3f) | 0x80;
  const hex = bytes.toString("hex");
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(
    12,
    16,
  )}-${hex.slice(16, 20)}-${hex.slice(20, 32)}`;
}

export function deterministicCatalogId(
  entityType: string,
  sourceKey: string,
  recordKey: string,
): string {
  return uuidV5(`${entityType}:${sourceKey}:${recordKey}`);
}

export function newCatalogId(): string {
  return randomUUID();
}

function canonicalValue(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(canonicalValue);
  if (value && typeof value === "object") {
    return Object.fromEntries(
      Object.entries(value)
        .filter(([, entry]) => entry !== undefined)
        .sort(([left], [right]) => left.localeCompare(right))
        .map(([key, entry]) => [key, canonicalValue(entry)]),
    );
  }
  if (typeof value === "number" && !Number.isFinite(value)) {
    throw new Error("Canonical JSON cannot contain non-finite numbers");
  }
  return value;
}

export function canonicalJson(value: unknown): string {
  const serialized = JSON.stringify(canonicalValue(value));
  if (serialized === undefined) {
    throw new Error("Canonical JSON requires a serializable value");
  }
  return serialized;
}

export function sha256(value: string): string {
  return createHash("sha256").update(value, "utf8").digest("hex");
}

export function hashCanonicalJson(value: unknown): string {
  return sha256(canonicalJson(value));
}
