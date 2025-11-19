"use server";

import { db } from "@/lib/db";
import { knowledgeBase } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { auth } from "@/app/(auth)/auth";
import { ChatSDKError } from "../errors";

/**
 * Crée une nouvelle entrée dans la base de connaissances avec ses embeddings
 */
export async function createKnowledgeBase(input: {
  filename: string;
  filepath: string;
  content: string;
}) {
  try {
    const session = await auth();

    if (!session?.user) {
      return {
        success: false,
        error: "Vous devez être connecté pour effectuer cette action",
      };
    }

    const { filename, filepath, content } = input;

    // Créer l'entrée dans la base de connaissances
    const [knowledge] = await db
      .insert(knowledgeBase)
      .values({
        filename,
        filepath,
        content,
        uploadedBy: session.user.id,
      })
      .returning();

    revalidatePath("/knowledge-base");

    return {
      success: true,
      message: `Document "${filename}" ajouté avec succès`,
      id: knowledge.id,
    };
  } catch (error) {
    console.error("Error creating knowledge base:", error);
    return {
      success: false,
      error:
        error instanceof Error ? error.message : "Erreur lors de l'ajout du document",
    };
  }
}

/**
 * Supprime un document et ses embeddings de la base de connaissances
 */
export async function deleteKnowledgeBase(id: string) {
  try {
    const session = await auth();

    if (!session?.user) {
      throw new ChatSDKError("unauthorized:chat");
    }

    // Vérifier que le document existe et appartient à l'utilisateur
    const [knowledge] = await db
      .select()
      .from(knowledgeBase)
      .where(eq(knowledgeBase.id, id));

    if (!knowledge) {
      return {
        success: false,
        error: "Document introuvable",
      };
    }

    // Supprimer le document
    await db.delete(knowledgeBase).where(eq(knowledgeBase.id, id));

    revalidatePath("/knowledge-base");

    return {
      success: true,
      message: `Document "${knowledge.filename}" supprimé avec succès`,
    };
  } catch (error) {
    console.error("Error deleting knowledge base:", error);
    return {
      success: false,
      error:
        error instanceof Error
          ? error.message
          : "Erreur lors de la suppression du document",
    };
  }
}

/**
 * Récupère tous les documents de la base de connaissances
 */
export async function getAllKnowledgeBase(): Promise<{
  success: true;
  documents: {
    id: string;
    filename: string;
    filepath: string;
    content: string;
    createdAt: Date;
    updatedAt: Date;
    uploadedBy: string;
  }[];
} | {
  success: false;
  error: string;
  documents: [];
}> {
  try {
    const session = await auth();

    if (!session?.user) {
      throw new ChatSDKError("unauthorized:chat");
    }

    const documents = await db
      .select({
        id: knowledgeBase.id,
        filename: knowledgeBase.filename,
        filepath: knowledgeBase.filepath,
        content: knowledgeBase.content,
        createdAt: knowledgeBase.createdAt,
        updatedAt: knowledgeBase.updatedAt,
        uploadedBy: knowledgeBase.uploadedBy,
      })
      .from(knowledgeBase)
      .orderBy(knowledgeBase.createdAt);

    return {
      success: true,
      documents,
    };
  } catch (error) {
    console.error("Error getting knowledge base:", error);
    return {
      success: false,
      error:
        error instanceof Error
          ? error.message
          : "Erreur lors de la récupération des documents",
      documents: [],
    };
  }
}

