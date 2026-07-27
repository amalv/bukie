import { NextResponse } from "next/server";
import { parseCatalogQuery } from "@/features/books/catalogQuery";
import { DEFAULT_BOOKS_PAGE_SIZE } from "@/features/books/pageSize";
import { getWorksPage } from "@/features/books/repo";

export async function GET(request: Request) {
  try {
    const url = new URL(request.url);
    const query = parseCatalogQuery(url.searchParams);
    const after = url.searchParams.get("after") ?? undefined;
    const limitRaw = url.searchParams.get("limit");
    const parsedLimit = limitRaw ? Number(limitRaw) : Number.NaN;
    const limit = Number.isFinite(parsedLimit)
      ? Math.max(1, Math.min(50, Math.trunc(parsedLimit)))
      : DEFAULT_BOOKS_PAGE_SIZE;
    const page = await getWorksPage({ query, after, limit });
    return NextResponse.json(page);
  } catch (err) {
    // eslint-disable-next-line no-console
    console.error("[/api/books/page] GET failed", err);
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 },
    );
  }
}

export async function OPTIONS() {
  return new NextResponse(null, {
    status: 204,
    headers: {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "GET,OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type,Authorization",
    },
  });
}
