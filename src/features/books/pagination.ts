import { Buffer } from "node:buffer";
import type { CatalogSort } from "./catalogQuery";

type CursorBase = {
  version: 1;
  id: string;
};

/** Opaque keyset cursor carrying every visible sort key plus work ID. */
export type CursorPayload =
  | (CursorBase & {
      sort: "title";
      sortTitle: string;
    })
  | (CursorBase & {
      sort: "added";
      catalogedAt: number | null;
    })
  | (CursorBase & {
      sort: "publication";
      publicationSortDate: string | null;
    });

export function encodeCursor(payload: CursorPayload): string {
  const json = JSON.stringify(payload);
  return Buffer.from(json, "utf8").toString("base64url");
}

export function decodeCursor(
  cursor?: string | null,
  expectedSort?: CatalogSort,
): CursorPayload | null {
  if (!cursor) return null;
  try {
    const json = Buffer.from(cursor, "base64url").toString("utf8");
    const obj = JSON.parse(json) as Record<string, unknown>;
    if (
      !obj ||
      obj.version !== 1 ||
      typeof obj.id !== "string" ||
      obj.id.length === 0
    ) {
      return null;
    }
    if (expectedSort && obj.sort !== expectedSort) return null;
    if (
      obj.sort === "title" &&
      typeof obj.sortTitle === "string" &&
      obj.sortTitle.length > 0
    ) {
      return {
        version: 1,
        sort: "title",
        sortTitle: obj.sortTitle,
        id: obj.id,
      };
    }
    if (
      obj.sort === "added" &&
      ((typeof obj.catalogedAt === "number" &&
        Number.isFinite(obj.catalogedAt) &&
        obj.catalogedAt >= 0) ||
        obj.catalogedAt === null)
    ) {
      return {
        version: 1,
        sort: "added",
        catalogedAt: obj.catalogedAt,
        id: obj.id,
      };
    }
    if (
      obj.sort === "publication" &&
      ((typeof obj.publicationSortDate === "string" &&
        /^\d{4}-\d{2}-\d{2}$/.test(obj.publicationSortDate)) ||
        obj.publicationSortDate === null)
    ) {
      return {
        version: 1,
        sort: "publication",
        publicationSortDate: obj.publicationSortDate,
        id: obj.id,
      };
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
  total: number;
};
