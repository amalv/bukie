import { NextResponse } from "next/server";
import { getBooks } from "@/features/books/data";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const books = await getBooks();
  const book = books.find((b) => b.id === id);
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
