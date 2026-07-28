import { NextResponse } from "next/server";
import { findWorkById } from "@/features/books/repo";
import type { WorkDetail } from "@/features/books/types";

function readerFacingDetail({
  provenance: _provenance,
  ...detail
}: WorkDetail): Omit<WorkDetail, "provenance"> {
  return detail;
}

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const work = await findWorkById(id);
  if (!work) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }
  return NextResponse.json(readerFacingDetail(work));
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
