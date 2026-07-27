import { NextResponse } from "next/server";
import { parseCatalogQuery } from "@/features/books/catalogQuery";
import { getWorks } from "@/features/books/repo";

export async function GET(request: Request) {
  try {
    const query = parseCatalogQuery(new URL(request.url).searchParams);
    return NextResponse.json(await getWorks(query));
  } catch (error) {
    console.error("[/api/books] GET failed", error);
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
