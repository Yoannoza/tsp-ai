"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { toast } from "@/components/toast";
import {
  deleteKnowledgeBase,
  regenerateEmbeddings,
} from "@/lib/actions/knowledge-base";
import { FileIcon, TrashIcon, LoaderIcon } from "@/components/icons";

export function DocumentList({
  documents,
}: {
  documents: {
    id: string;
    filename: string;
    filepath: string;
    content: string;
    createdAt: Date;
    updatedAt: Date;
    uploadedBy: string;
  }[];
}) {
  const router = useRouter();
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [regenerateId, setRegenerateId] = useState<string | null>(null);
  const [loading, setLoading] = useState<string | null>(null);

  const handleDelete = async (id: string) => {
    setLoading(id);
    const result = await deleteKnowledgeBase(id);

    if (result.success) {
      toast({ type: "success", description: result.message || "Document supprimé" });
      router.refresh();
    } else {
      toast({ type: "error", description: result.error || "Erreur lors de la suppression" });
    }

    setLoading(null);
    setDeleteId(null);
  };

  const handleRegenerate = async (id: string) => {
    setLoading(id);
    const result = await regenerateEmbeddings(id);

    if (result.success) {
      toast({ type: "success", description: result.message || "Embeddings régénérés" });
      router.refresh();
    } else {
      toast({ type: "error", description: result.error || "Erreur lors de la régénération" });
    }

    setLoading(null);
    setRegenerateId(null);
  };

  if (documents.length === 0) {
    return (
      <Card>
        <CardContent className="pt-6">
          <p className="text-center text-muted-foreground">
            Aucun document dans la base de connaissances
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      {documents.map((doc) => (
        <Card key={doc.id}>
          <CardHeader>
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-3">
                <FileIcon size={20} />
                <div>
                  <CardTitle className="text-base">{doc.filename}</CardTitle>
                  <p className="text-muted-foreground text-sm">
                    {doc.filepath}
                  </p>
                </div>
              </div>
              <div className="flex gap-2">
                <Button
                  disabled={loading === doc.id}
                  onClick={() => setRegenerateId(doc.id)}
                  size="sm"
                  variant="outline"
                >
                  <LoaderIcon size={16} />
                </Button>
                <Button
                  disabled={loading === doc.id}
                  onClick={() => setDeleteId(doc.id)}
                  size="sm"
                  variant="destructive"
                >
                  <TrashIcon size={16} />
                </Button>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-muted-foreground text-sm">
              <p>
                Ajouté le:{" "}
                {new Date(doc.createdAt).toLocaleDateString("fr-FR", {
                  day: "numeric",
                  month: "long",
                  year: "numeric",
                  hour: "2-digit",
                  minute: "2-digit",
                })}
              </p>
              <p>Taille: {(doc.content.length / 1024).toFixed(2)} KB</p>
            </div>
          </CardContent>
        </Card>
      ))}

      {/* Delete Dialog */}
      <AlertDialog
        onOpenChange={(open) => !open && setDeleteId(null)}
        open={!!deleteId}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirmer la suppression</AlertDialogTitle>
            <AlertDialogDescription>
              Êtes-vous sûr de vouloir supprimer ce document ? Cette action est
              irréversible et supprimera également tous les embeddings associés.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Annuler</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => deleteId && handleDelete(deleteId)}
            >
              Supprimer
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Regenerate Dialog */}
      <AlertDialog
        onOpenChange={(open) => !open && setRegenerateId(null)}
        open={!!regenerateId}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Régénérer les embeddings</AlertDialogTitle>
            <AlertDialogDescription>
              Cette opération va supprimer tous les embeddings existants et en
              créer de nouveaux. Cela peut prendre quelques instants.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Annuler</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => regenerateId && handleRegenerate(regenerateId)}
            >
              Régénérer
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
