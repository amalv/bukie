import { NextResponse } from "next/server";
import { deleteBook, findBookById, updateBook } from "@/features/books/repo";

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
  const body = (await request.json()) as Partial<{
    title: string;
    author: string;
    cover: string;
  }>;
  const updated = await updateBook(id, body);
  if (!updated)
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json(updated);
}

export async function DELETE(
  _: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const ok = await deleteBook(id);
  if (!ok) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return new NextResponse(null, { status: 204 });
}
