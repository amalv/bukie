import { Buffer } from "node:buffer";

/** Opaque keyset cursor for the canonical (sort_title, work.id) ordering. */
export type CursorPayload = { sortTitle: string; id: string };

export function encodeCursor(payload: CursorPayload): string {
  const json = JSON.stringify(payload);
  return Buffer.from(json, "utf8").toString("base64url");
}

export function decodeCursor(cursor?: string | null): CursorPayload | null {
  if (!cursor) return null;
  try {
    const json = Buffer.from(cursor, "base64url").toString("utf8");
    const obj = JSON.parse(json);
    if (
      obj &&
      typeof obj.sortTitle === "string" &&
      typeof obj.id === "string"
    ) {
      return { sortTitle: obj.sortTitle, id: obj.id };
    }
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
