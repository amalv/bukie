import { NextResponse } from "next/server";
import { getBooks } from "@/features/books/data";
import { createBook } from "@/features/books/repo";

export async function GET() {
  const data = await getBooks();
  return NextResponse.json(data);
}

export async function POST(request: Request) {
  const body = (await request.json()) as Partial<{
    id: string;
    title: string;
    author: string;
    cover: string;
  }>;
  if (!body || !body.title || !body.author || !body.cover) {
    return NextResponse.json({ error: "Invalid payload" }, { status: 400 });
  }
  const created = await createBook({
    id: body.id,
    title: body.title,
    author: body.author,
    cover: body.cover,
  });
  return NextResponse.json(created, { status: 201 });
}
