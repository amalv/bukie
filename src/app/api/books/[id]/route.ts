import { NextResponse } from "next/server";
import { findBookById } from "@/features/books/repo";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const book = await findBookById(id);
  if (!book) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }
  return NextResponse.json(book);
}

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const data = await request.json();
  // TODO: Update in DB in future
  // For now, just echo back
  return NextResponse.json({ success: true, id, update: data });
}

export async function DELETE(
  _: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  // TODO: Delete from DB in future
  // For now, just echo back
  return NextResponse.json({ success: true, id });
}
