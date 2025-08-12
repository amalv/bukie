import { NextResponse } from "next/server";
import { getBooks } from "@/features/books/data";

export async function GET() {
  const data = await getBooks();
  return NextResponse.json(data);
}
