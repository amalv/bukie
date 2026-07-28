import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { BookDetails } from "@/features/books/BookDetails";
import {
  buildBookStructuredData,
  serializeStructuredData,
} from "@/features/books/detailPresentation";
import { findWorkById } from "@/features/books/repo";
import type { WorkDetail } from "@/features/books/types";

export const dynamic = "force-dynamic";

export function buildWorkMetadata(work: WorkDetail): Metadata {
  const authors = work.authors.map((author) => author.name).join(", ");
  return {
    title: authors ? `${work.title} — ${authors}` : work.title,
    description:
      work.description ?? (authors ? `${work.title} — ${authors}` : work.title),
    alternates: {
      canonical: `/books/${work.id}`,
    },
  };
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>;
}): Promise<Metadata> {
  const { id } = await params;
  const work = await findWorkById(id);
  if (!work) return { title: "Book not found" };
  return buildWorkMetadata(work);
}

export default async function BookPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const work = await findWorkById(id);
  if (!work) notFound();
  const structuredData = serializeStructuredData(buildBookStructuredData(work));
  return (
    <main>
      <script type="application/ld+json">{structuredData}</script>
      <BookDetails work={work} />
    </main>
  );
}
