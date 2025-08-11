import { NextResponse } from "next/server";
import { books } from "../../../../mocks/books";

export async function GET() {
  return NextResponse.json(books);
}
