import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { BookDetails } from "@/features/books/BookDetails";
import { findWorkById } from "@/features/books/repo";

export const dynamic = "force-dynamic";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>;
}): Promise<Metadata> {
  const { id } = await params;
  const work = await findWorkById(id);
  if (!work) return { title: "Book not found" };
  const authors = work.authors.map((author) => author.name).join(", ");
  return {
    title: authors ? `${work.title} — ${authors}` : work.title,
    description:
      work.description ??
      (authors
        ? `Catalog details for ${work.title} by ${authors}`
        : `Catalog details for ${work.title}`),
  };
}

export default async function BookPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const work = await findWorkById(id);
  if (!work) notFound();
  return (
    <main>
      <BookDetails work={work} />
    </main>
  );
}
