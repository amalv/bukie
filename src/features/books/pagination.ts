import { Buffer } from "node:buffer";

/**
 * Opaque cursor utilities for keyset pagination.
 * We currently paginate by id DESC. When a createdAt field is added,
 * extend the payload to include { createdAt, id } and update comparisons.
 */
export type CursorPayload = { id: string };

export function encodeCursor(payload: CursorPayload): string {
  const json = JSON.stringify(payload);
  return Buffer.from(json, "utf8").toString("base64url");
}

export function decodeCursor(cursor?: string | null): CursorPayload | null {
  if (!cursor) return null;
  try {
    const json = Buffer.from(cursor, "base64url").toString("utf8");
    const obj = JSON.parse(json);
    if (obj && typeof obj.id === "string") return { id: obj.id };
    return null;
  } catch {
    return null;
  }
}

export type PageResult<T> = {
  items: T[];
  nextCursor?: string;
  hasNext: boolean;
};
