import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { BookDetails } from "@/features/books/BookDetails";
import { findBookById } from "@/features/books/repo";

export const dynamic = "force-dynamic";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>;
}): Promise<Metadata> {
  const { id } = await params;
  const book = await findBookById(id);
  if (!book) return { title: "Book not found" };
  return {
    title: `${book.title} — ${book.author}`,
    description: `Details for ${book.title} by ${book.author}`,
  };
}

export default async function BookPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const book = await findBookById(id);
  if (!book) notFound();
  return (
    <main>
      <BookDetails book={book} />
    </main>
  );
}
