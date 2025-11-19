"use server";

import { db } from "@/lib/db";
import { embeddings, knowledgeBase } from "@/lib/db/schema";
import { generateEmbeddings } from "@/lib/ai/embedding";
import { revalidatePath } from "next/cache";
import { auth } from "@/app/(auth)/auth";
import { ChatSDKError } from "../errors";

/**
 * Extrait le texte d'un fichier
 */
async function extractText(file: File): Promise<string> {
  const filename = file.name.toLowerCase();

  // Pour les fichiers texte et markdown
  if (filename.endsWith(".txt") || filename.endsWith(".md")) {
    return await file.text();
  }

  // Pour les PDFs, on utiliserait une lib comme pdf-parse
  // Pour l'instant, on retourne une erreur
  if (filename.endsWith(".pdf")) {
    throw new Error(
      "Support PDF à venir. Utilisez .md ou .txt pour le moment."
    );
  }

  // Pour les DOCX
  if (filename.endsWith(".docx")) {
    throw new Error(
      "Support DOCX à venir. Utilisez .md ou .txt pour le moment."
    );
  }

  throw new Error("Format de fichier non supporté");
}

/**
 * Upload un document et crée ses embeddings
 */
export async function uploadDocument(formData: FormData) {
  try {
    const session = await auth();

    if (!session?.user) {
      throw new ChatSDKError("unauthorized:chat");
    }

    const file = formData.get("file") as File;

    if (!file) {
      return {
        success: false,
        error: "Aucun fichier fourni",
      };
    }

    // Extraire le texte
    let content: string;
    try {
      content = await extractText(file);
    } catch (error) {
      return {
        success: false,
        error:
          error instanceof Error ? error.message : "Erreur d'extraction du texte",
      };
    }

    if (!content || content.trim().length === 0) {
      return {
        success: false,
        error: "Le fichier est vide",
      };
    }

    // Créer l'entrée dans la base de connaissances
    const [knowledge] = await db
      .insert(knowledgeBase)
      .values({
        filename: file.name,
        filepath: `uploads/${file.name}`,
        content,
        uploadedBy: session.user.id,
      })
      .returning();

    // Générer et sauvegarder les embeddings
    console.log(`Génération des embeddings pour ${file.name}...`);
    const embeddingsList = await generateEmbeddings(content);

    await db.insert(embeddings).values(
      embeddingsList.map((embedding) => ({
        knowledgeBaseId: knowledge.id,
        content: embedding.content,
        embedding: embedding.embedding,
      }))
    );

    console.log(
      `✅ ${embeddingsList.length} embeddings créés pour ${file.name}`
    );

    revalidatePath("/admin/knowledge-base");

    return {
      success: true,
      message: `Document "${file.name}" ajouté avec succès (${embeddingsList.length} chunks créés)`,
      documentId: knowledge.id,
    };
  } catch (error) {
    console.error("Error uploading document:", error);
    return {
      success: false,
      error:
        error instanceof Error
          ? error.message
          : "Erreur lors de l'upload du document",
    };
  }
}
