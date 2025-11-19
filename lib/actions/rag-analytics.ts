"use server";

import { db } from "@/lib/db";
import { ragQuery, ragCitation } from "@/lib/db/schema-rag-analytics";
import { desc, sql, and, gte } from "drizzle-orm";
import { auth } from "@/app/(auth)/auth";
import { ChatSDKError } from "../errors";

/**
 * Enregistre une requête RAG
 */
export async function logRagQuery(params: {
  query: string;
  resultCount: number;
  avgSimilarity: number | null;
  executionTime: number;
  citations?: Array<{ knowledgeBaseId: string; similarity: number }>;
}) {
  try {
    const session = await auth();
    const { query, resultCount, avgSimilarity, executionTime, citations } = params;

    // Créer l'entrée de query
    const [queryLog] = await db
      .insert(ragQuery)
      .values({
        query,
        resultCount: resultCount.toString(),
        avgSimilarity: avgSimilarity,
        executionTime: executionTime.toString(),
        userId: session?.user?.id || null,
      })
      .returning();

    // Si des citations sont fournies, les enregistrer
    if (citations && citations.length > 0) {
      await db.insert(ragCitation).values(
        citations.map((citation) => ({
          ragQueryId: queryLog.id,
          knowledgeBaseId: citation.knowledgeBaseId,
          similarity: citation.similarity,
        }))
      );
    }

    return { success: true, queryId: queryLog.id };
  } catch (error) {
    console.error("Error logging RAG query:", error);
    return { success: false };
  }
}

/**
 * Récupère les statistiques RAG pour l'administration
 */
export async function getRagAnalytics(days: number = 30) {
  try {
    const session = await auth();

    if (!session?.user) {
      throw new ChatSDKError("unauthorized:chat");
    }

    const dateThreshold = new Date();
    dateThreshold.setDate(dateThreshold.setDate(dateThreshold.getDate() - days));

    // Requêtes totales
    const [totalQueries] = await db
      .select({ count: sql<number>`count(*)` })
      .from(ragQuery)
      .where(gte(ragQuery.createdAt, dateThreshold));

    // Temps d'exécution moyen
    const [avgExecution] = await db
      .select({
        avg: sql<number>`AVG(CAST(${ragQuery.executionTime} AS FLOAT))`,
      })
      .from(ragQuery)
      .where(gte(ragQuery.createdAt, dateThreshold));

    // Similarité moyenne
    const [avgSim] = await db
      .select({
        avg: sql<number>`AVG(${ragQuery.avgSimilarity})`,
      })
      .from(ragQuery)
      .where(
        and(
          gte(ragQuery.createdAt, dateThreshold),
          sql`${ragQuery.avgSimilarity} IS NOT NULL`
        )
      );

    // Top 10 requêtes
    const topQueries = await db
      .select({
        query: ragQuery.query,
        count: sql<number>`count(*)`,
      })
      .from(ragQuery)
      .where(gte(ragQuery.createdAt, dateThreshold))
      .groupBy(ragQuery.query)
      .orderBy(desc(sql`count(*)`))
      .limit(10);

    // Documents les plus cités
    const topDocuments = await db
      .select({
        documentId: ragCitation.knowledgeBaseId,
        citationCount: sql<number>`count(*)`,
        avgSimilarity: sql<number>`AVG(${ragCitation.similarity})`,
      })
      .from(ragCitation)
      .innerJoin(ragQuery, sql`${ragQuery.id} = ${ragCitation.ragQueryId}`)
      .where(gte(ragQuery.createdAt, dateThreshold))
      .groupBy(ragCitation.knowledgeBaseId)
      .orderBy(desc(sql`count(*)`))
      .limit(10);

    // Requêtes sans résultats (pour identifier les gaps)
    const [noResultQueries] = await db
      .select({ count: sql<number>`count(*)` })
      .from(ragQuery)
      .where(
        and(
          gte(ragQuery.createdAt, dateThreshold),
          sql`CAST(${ragQuery.resultCount} AS INTEGER) = 0`
        )
      );

    return {
      success: true,
      analytics: {
        totalQueries: Number(totalQueries.count) || 0,
        avgExecutionTime: Number(avgExecution.avg?.toFixed(2)) || 0,
        avgSimilarity: Number(avgSim.avg?.toFixed(3)) || 0,
        noResultRate:
          Number(totalQueries.count) > 0
            ? (Number(noResultQueries.count) / Number(totalQueries.count)) * 100
            : 0,
        topQueries,
        topDocuments,
      },
    };
  } catch (error) {
    console.error("Error getting RAG analytics:", error);
    return {
      success: false,
      error:
        error instanceof Error
          ? error.message
          : "Erreur lors de la récupération des analytics",
    };
  }
}
