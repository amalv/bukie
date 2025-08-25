import { NextResponse } from "next/server";
import { getBooks } from "@/features/books/data";
import { createBook } from "@/features/books/repo";

export async function GET() {
  try {
    const data = await getBooks();
    return NextResponse.json(data);
  } catch (err) {
    // eslint-disable-next-line no-console
    console.error("[/api/books] GET failed", err);
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 },
    );
  }
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

// Support preflight requests (CORS) to avoid 400 responses for OPTIONS
export async function OPTIONS() {
  return new NextResponse(null, {
    status: 204,
    headers: {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "GET,POST,OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type,Authorization",
    },
  });
}
