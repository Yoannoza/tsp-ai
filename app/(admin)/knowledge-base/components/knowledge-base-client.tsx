"use client";

import { useRouter } from "next/navigation";
import { DocumentList } from "./document-list";
import { UploadDocument } from "./upload-document";

type Document = {
  id: string;
  filename: string;
  filepath: string;
  content: string;
  createdAt: Date;
  updatedAt: Date;
  uploadedBy: string;
};

export function KnowledgeBaseClient({ documents }: { documents: Document[] }) {
  const router = useRouter();

  const handleUpdate = () => {
    router.refresh();
  };

  return (
    <>
      <div className="mb-6">
        <UploadDocument onUploadSuccess={handleUpdate} />
      </div>

      <DocumentList documents={documents} />
    </>
  );
}
