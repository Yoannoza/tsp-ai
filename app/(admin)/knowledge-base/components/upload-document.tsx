"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "@/components/toast";
import { uploadDocument } from "@/lib/actions/upload-document";
import { LoaderIcon, UploadIcon } from "@/components/icons";

export function UploadDocument({ onUploadSuccess }: { onUploadSuccess: () => void }) {
  const [isUploading, setIsUploading] = useState(false);
  const [file, setFile] = useState<File | null>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (selectedFile) {
      // Vérifier le type de fichier
      const allowedTypes = [
        "text/markdown",
        "text/plain",
        "application/pdf",
        "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
      ];
      
      if (!allowedTypes.includes(selectedFile.type) && 
          !selectedFile.name.endsWith(".md") && 
          !selectedFile.name.endsWith(".txt")) {
        toast({
          type: "error",
          description: "Format non supporté. Utilisez .md, .txt, .pdf ou .docx",
        });
        return;
      }

      // Vérifier la taille (max 10MB)
      if (selectedFile.size > 10 * 1024 * 1024) {
        toast({
          type: "error",
          description: "Le fichier ne doit pas dépasser 10MB",
        });
        return;
      }

      setFile(selectedFile);
    }
  };

  const handleUpload = async () => {
    if (!file) {
      toast({ type: "error", description: "Veuillez sélectionner un fichier" });
      return;
    }

    setIsUploading(true);

    try {
      const formData = new FormData();
      formData.append("file", file);

      const result = await uploadDocument(formData);

      if (result.success) {
        toast({
          type: "success",
          description: result.message || "Document uploadé avec succès",
        });
        setFile(null);
        // Reset input
        const input = document.querySelector('input[type="file"]') as HTMLInputElement;
        if (input) input.value = "";
        onUploadSuccess();
      } else {
        toast({
          type: "error",
          description: result.error || "Erreur lors de l'upload",
        });
      }
    } catch (error) {
      console.error("Upload error:", error);
      toast({
        type: "error",
        description: "Erreur lors de l'upload du document",
      });
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Ajouter un Document</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="file">Fichier (.md, .txt, .pdf, .docx)</Label>
            <Input
              accept=".md,.txt,.pdf,.docx,text/markdown,text/plain,application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
              disabled={isUploading}
              id="file"
              onChange={handleFileChange}
              type="file"
            />
            {file && (
              <p className="text-muted-foreground text-sm">
                Sélectionné: {file.name} ({(file.size / 1024).toFixed(2)} KB)
              </p>
            )}
          </div>

          <Button
            className="w-full"
            disabled={!file || isUploading}
            onClick={handleUpload}
          >
            {isUploading ? (
              <>
                <span className="mr-2">
                  <LoaderIcon size={16} />
                </span>
                Upload en cours...
              </>
            ) : (
              <>
                <span className="mr-2">
                  <UploadIcon size={16} />
                </span>
                Uploader le document
              </>
            )}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
