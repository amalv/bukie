import { NextResponse } from "next/server";
import { getBooks } from "@/features/books/data";

export async function GET(
  _request: Request,
  context: { params: { id: string } },
) {
  const books = await getBooks();
  const book = books.find((b) => b.id === context.params.id);
  if (!book) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }
  return NextResponse.json(book);
}

export async function PUT(
  request: Request,
  { params }: { params: { id: string } },
) {
  const data = await request.json();
  // TODO: Update in DB in future
  // For now, just echo back
  return NextResponse.json({ success: true, id: params.id, update: data });
}

export async function DELETE(
  _: Request,
  { params }: { params: { id: string } },
) {
  // TODO: Delete from DB in future
  // For now, just echo back
  return NextResponse.json({ success: true, id: params.id });
}
