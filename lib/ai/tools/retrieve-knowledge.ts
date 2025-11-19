import { tool } from "ai";
import { z } from "zod";
import { findRelevantContent } from "../embedding";

export const retrieveKnowledge = tool({
  description: `Search the knowledge base for relevant information.
    Use this tool when the user asks about:
    - TSP algorithms (Held-Karp, Christofides, etc.)
    - Heuristics and metaheuristics (Simulated Annealing, Genetic Algorithms, etc.)
    - Implementation details (Python, NetworkX, OR-Tools)
    - Time complexity and performance of different approaches
    - Any topic related to the Traveling Salesperson Problem`,
  inputSchema: z.object({
    query: z
      .string()
      .describe("La question ou le sujet pour lequel chercher des informations"),
  }),
  execute: async ({ query }) => {
    const start = Date.now();
    console.log('[retrieveKnowledge] Tool called with query:', query);

    try {
      const results = await findRelevantContent(query, 5, 0.3);

      const duration = Date.now() - start;
      console.log(`[retrieveKnowledge] findRelevantContent finished in ${duration}ms`);
      console.log('[retrieveKnowledge] Results found:', results.length);

      if (results.length === 0) {
        console.log('[retrieveKnowledge] No relevant content found');
        return {
          success: false,
          message:
            "Aucune information pertinente trouvée dans la base de connaissances.",
          results: [],
        };
      }

      // Log a compact preview of the top results for debugging
      const previewCount = Math.min(3, results.length);
      for (let i = 0; i < previewCount; i++) {
        const r = results[i];
        console.log(`[retrieveKnowledge] Top ${i + 1} - similarity: ${Number(r.similarity).toFixed(4)} | preview: ${String(r.content).substring(0, 160).replace(/\n/g, ' ')}...`);
        try {
          console.log('[retrieveKnowledge]   metadata keys:', r.metadata ? Object.keys(r.metadata) : 'none');
        } catch (e) {
          // ignore metadata logging issues
        }
      }

      console.log('[retrieveKnowledge] Returning', results.length, 'results (similarity scaled 0-100)');
      return {
        success: true,
        message: `${results.length} information(s) pertinente(s) trouvée(s).`,
        results: results.map((r) => ({
          content: r.content,
          similarity: Math.round(Number(r.similarity) * 100),
          metadata: r.metadata ?? null,
        })),
      };
    } catch (error) {
      console.error('[retrieveKnowledge] ERROR:', error instanceof Error ? error.message : error);
      console.error('[retrieveKnowledge] Stack:', error instanceof Error ? error.stack : 'N/A');
      return {
        success: false,
        message: `Erreur lors de la recherche: ${error instanceof Error ? error.message : 'Unknown error'}`,
        results: [],
      };
    }
  },
});
