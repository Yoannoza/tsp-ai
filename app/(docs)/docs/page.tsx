import { notFound } from "next/navigation";
import { getDocContent, DocContent } from "@/lib/docs";

export default async function DocsPage() {
  const doc = await getDocContent([]);
  
  if (!doc) {
    notFound();
  }

  return <DocContent content={doc.content} />;
}
