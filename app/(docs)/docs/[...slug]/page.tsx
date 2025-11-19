import { notFound } from "next/navigation";
import { getDocContent, DocContent } from "@/lib/docs";

export default async function DocPage({
  params,
}: {
  params: Promise<{ slug: string[] }>;
}) {
  const { slug } = await params;
  const doc = await getDocContent(slug);
  
  if (!doc) {
    notFound();
  }

  return <DocContent content={doc.content} />;
}

export function generateStaticParams() {
  return [
    { slug: ['architecture', 'overview'] },
    { slug: ['architecture', 'stack'] },
    { slug: ['architecture', 'rag'] },
    { slug: ['usage', 'chat'] },
    { slug: ['usage', 'evaluation'] },
    { slug: ['tests', 'dataset'] },
    { slug: ['tests', 'evaluation-results'] },
    { slug: ['status', 'next-steps'] },
  ];
}
