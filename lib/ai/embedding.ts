import { embed, embedMany } from "ai";
import { google } from "@ai-sdk/google";
import { cosineDistance, desc, gt, sql } from "drizzle-orm";
import { db } from "../db";
import { embeddings } from "../db/schema";
import { getVercelTelemetry } from "../observability/telemetry";

const embeddingModel = google.textEmbeddingModel("text-embedding-004");

/**
 * Types de documents supportés
 */
export enum DocumentType {
  GUIDE_BONNES_PRATIQUES = "guide_bonnes_pratiques",
  RAPPORT_MATURITE = "rapport_maturite",
  CODE_NUMERIQUE = "code_numerique",
  DECRET = "decret",
  LOI = "loi",
  STRATEGIE_NATIONALE = "strategie_nationale",
  GUIDE_ENTREPRENEUR = "guide_entrepreneur",
}

/**
 * Axes de maturité organisationnelle
 */
export enum AxeMaturite {
  STRATEGIE = "strategie",
  VENTE_MARKETING = "vente_marketing",
  EXECUTION_PROJETS = "execution_projets",
  RESSOURCES_HUMAINES = "ressources_humaines",
  FINANCE_COMPTABILITE = "finance_comptabilite",
}

/**
 * Niveaux de maturité
 */
export enum NiveauMaturite {
  BASIQUE = "basique",
  EN_DEVELOPPEMENT = "en_developpement",
  ETABLI = "etabli",
  AVANCE = "avance",
}

/**
 * Métadonnées pour un chunk
 */
export interface ChunkMetadata {
  documentType: DocumentType;
  axe?: AxeMaturite;
  niveau?: NiveauMaturite;
  chapitre?: string;
  section?: string;
  article?: string;
  entites?: string[]; // ESN, ASIN, startups, etc.
  concepts?: string[]; // IA, cybersécurité, due diligence, etc.
  page?: number;
}

/**
 * Chunk structuré avec métadonnées
 */
export interface StructuredChunk {
  content: string;
  metadata: ChunkMetadata;
}

/**
 * Détecte le type de document basé sur le contenu
 */
const detectDocumentType = (text: string): DocumentType => {
  const lowerText = text.toLowerCase();
  
  if (lowerText.includes("guide des bonnes pratiques") || lowerText.includes("esn béninoises")) {
    return DocumentType.GUIDE_BONNES_PRATIQUES;
  }
  if (lowerText.includes("maturité organisationnelle") || lowerText.includes("framework d'évaluation")) {
    return DocumentType.RAPPORT_MATURITE;
  }
  if (lowerText.includes("code du numérique")) {
    return DocumentType.CODE_NUMERIQUE;
  }
  if (lowerText.includes("décret n°")) {
    return DocumentType.DECRET;
  }
  if (lowerText.includes("loi n°")) {
    return DocumentType.LOI;
  }
  if (lowerText.includes("stratégie nationale") && (lowerText.includes("intelligence artificielle") || lowerText.includes("mégadonnées"))) {
    return DocumentType.STRATEGIE_NATIONALE;
  }
  if (lowerText.includes("guide de l'entrepreneur digital") || lowerText.includes("idéation") || lowerText.includes("pré-amorçage")) {
    return DocumentType.GUIDE_ENTREPRENEUR;
  }
  
  return DocumentType.GUIDE_BONNES_PRATIQUES; // Défaut
};

/**
 * Détecte l'axe de maturité dans le texte
 */
const detectAxe = (text: string): AxeMaturite | undefined => {
  const lowerText = text.toLowerCase();
  
  if (lowerText.includes("stratégie") || lowerText.includes("vision") || lowerText.includes("objectifs stratégiques")) {
    return AxeMaturite.STRATEGIE;
  }
  if (lowerText.includes("vente") || lowerText.includes("marketing") || lowerText.includes("commercial") || lowerText.includes("b2g")) {
    return AxeMaturite.VENTE_MARKETING;
  }
  if (lowerText.includes("exécution") || lowerText.includes("gestion de projet") || lowerText.includes("méthodologie agile")) {
    return AxeMaturite.EXECUTION_PROJETS;
  }
  if (lowerText.includes("ressources humaines") || lowerText.includes("recrutement") || lowerText.includes("formation") || lowerText.includes("talents")) {
    return AxeMaturite.RESSOURCES_HUMAINES;
  }
  if (lowerText.includes("finance") || lowerText.includes("comptabilité") || lowerText.includes("trésorerie") || lowerText.includes("rentabilité")) {
    return AxeMaturite.FINANCE_COMPTABILITE;
  }
  
  return undefined;
};

/**
 * Extrait les entités clés du texte
 */
const extractEntities = (text: string): string[] => {
  const entities: string[] = [];
  const lowerText = text.toLowerCase();
  
  if (lowerText.includes("esn")) entities.push("ESN");
  if (lowerText.includes("startup")) entities.push("Startup");
  if (lowerText.includes("asin") || lowerText.includes("agence des systèmes d'information")) entities.push("ASIN");
  if (lowerText.includes("arcep")) entities.push("ARCEP");
  if (lowerText.includes("ministère")) entities.push("Ministère");
  
  return entities;
};

/**
 * Extrait les concepts techniques du texte
 */
const extractConcepts = (text: string): string[] => {
  const concepts: string[] = [];
  const lowerText = text.toLowerCase();
  
  if (lowerText.includes("intelligence artificielle") || lowerText.includes("ia")) concepts.push("IA");
  if (lowerText.includes("cybersécurité")) concepts.push("Cybersécurité");
  if (lowerText.includes("due diligence")) concepts.push("Due Diligence");
  if (lowerText.includes("data room")) concepts.push("Data Room");
  if (lowerText.includes("design thinking")) concepts.push("Design Thinking");
  if (lowerText.includes("scrum") || lowerText.includes("kanban") || lowerText.includes("agile")) concepts.push("Méthodologie Agile");
  if (lowerText.includes("kpi")) concepts.push("KPI");
  if (lowerText.includes("mégadonnées") || lowerText.includes("big data")) concepts.push("Mégadonnées");
  
  return concepts;
};

/**
 * Chunking intelligent basé sur la structure du document
 */
const generateStructuredChunks = (input: string): StructuredChunk[] => {
  const documentType = detectDocumentType(input);
  const chunks: StructuredChunk[] = [];
  
  switch (documentType) {
    case DocumentType.CODE_NUMERIQUE:
    case DocumentType.LOI:
    case DocumentType.DECRET:
      // Pour les textes légaux : découpage par article
      return chunkLegalDocument(input, documentType);
    
    case DocumentType.GUIDE_BONNES_PRATIQUES:
    case DocumentType.RAPPORT_MATURITE:
      // Pour les guides : découpage par section et bonne pratique
      return chunkGuideDocument(input, documentType);
    
    case DocumentType.STRATEGIE_NATIONALE:
      // Pour la stratégie : découpage par action
      return chunkStrategyDocument(input, documentType);
    
    case DocumentType.GUIDE_ENTREPRENEUR:
      // Pour le guide entrepreneur : découpage par phase et processus
      return chunkEntrepreneurGuide(input, documentType);
    
    default:
      // Fallback : chunking sémantique par paragraphe
      return chunkByParagraph(input, documentType);
  }
};

/**
 * Découpe un document légal par articles
 */
const chunkLegalDocument = (text: string, docType: DocumentType): StructuredChunk[] => {
  const chunks: StructuredChunk[] = [];
  
  // Regex pour détecter les articles (Article 123, Art. 456, etc.)
  const articleRegex = /(?:Article|Art\.?)\s+(\d+)[:\s\-.]+(.*?)(?=(?:Article|Art\.?)\s+\d+|$)/gis;
  
  let match;
  let currentChapitre = "";
  
  while ((match = articleRegex.exec(text)) !== null) {
    const articleNum = match[1];
    const content = match[2].trim();
    
    // Détection du chapitre (si mentionné avant l'article)
    const chapitreMatch = text.substring(Math.max(0, match.index - 200), match.index).match(/(?:Chapitre|CHAPITRE)\s+([IVXLCDM]+|[\d]+)[:\s\-]+([^\n]+)/i);
    if (chapitreMatch) {
      currentChapitre = `${chapitreMatch[1]}: ${chapitreMatch[2].trim()}`;
    }
    
    if (content.length > 30) {
      chunks.push({
        content: `Article ${articleNum}: ${content}`,
        metadata: {
          documentType: docType,
          article: articleNum,
          chapitre: currentChapitre,
          entites: extractEntities(content),
          concepts: extractConcepts(content),
        },
      });
    }
  }
  
  // Si aucun article détecté, utiliser le chunking par paragraphe
  return chunks.length > 0 ? chunks : chunkByParagraph(text, docType);
};

/**
 * Découpe un guide par sections et bonnes pratiques
 */
const chunkGuideDocument = (text: string, docType: DocumentType): StructuredChunk[] => {
  const chunks: StructuredChunk[] = [];
  
  // Découpage par sections majeures (##, ###, etc.)
  const sections = text.split(/(?=^#{1,3}\s+)/m);
  
  for (const section of sections) {
    if (section.trim().length < 50) continue;
    
    // Extraction du titre de section
    const titleMatch = section.match(/^#{1,3}\s+(.+?)$/m);
    const sectionTitle = titleMatch ? titleMatch[1].trim() : "";
    
    // Détection de l'axe de maturité
    const axe = detectAxe(section);
    
    // Découpage des listes de bonnes pratiques (lignes commençant par -, *, ou numéros)
    const practices = section.split(/\n(?=[-*•]\s+|\d+[\.)]\s+)/);
    
    for (const practice of practices) {
      const cleanContent = practice.trim();
      
      if (cleanContent.length > 50) {
        chunks.push({
          content: cleanContent,
          metadata: {
            documentType: docType,
            section: sectionTitle,
            axe,
            entites: extractEntities(cleanContent),
            concepts: extractConcepts(cleanContent),
          },
        });
      }
    }
  }
  
  return chunks.length > 0 ? chunks : chunkByParagraph(text, docType);
};

/**
 * Découpe un document de stratégie par actions
 */
const chunkStrategyDocument = (text: string, docType: DocumentType): StructuredChunk[] => {
  const chunks: StructuredChunk[] = [];
  
  // Regex pour détecter les actions (Action 1.2, Action 4.3, etc.)
  const actionRegex = /(?:Action|ACTION)\s+([\d.]+)[:\s\-]+(.*?)(?=(?:Action|ACTION)\s+[\d.]+|$)/gis;
  
  let match;
  while ((match = actionRegex.exec(text)) !== null) {
    const actionNum = match[1];
    const content = match[2].trim();
    
    if (content.length > 50) {
      chunks.push({
        content: `Action ${actionNum}: ${content}`,
        metadata: {
          documentType: docType,
          section: `Action ${actionNum}`,
          entites: extractEntities(content),
          concepts: extractConcepts(content),
        },
      });
    }
  }
  
  return chunks.length > 0 ? chunks : chunkByParagraph(text, docType);
};

/**
 * Découpe le guide entrepreneur par phases
 */
const chunkEntrepreneurGuide = (text: string, docType: DocumentType): StructuredChunk[] => {
  const chunks: StructuredChunk[] = [];
  
  // Phases du cycle de vie entrepreneurial
  const phases = ["Idéation", "Pré-amorçage", "Amorçage", "Croissance", "Expansion"];
  
  for (const phase of phases) {
    const phaseRegex = new RegExp(`(?:${phase}|${phase.toUpperCase()})[:\\s\\-]+([^]*?)(?=${phases.join("|")}|$)`, "i");
    const match = text.match(phaseRegex);
    
    if (match && match[1]) {
      const phaseContent = match[1].trim();
      
      // Découper par processus ou outils au sein de la phase
      const subSections = phaseContent.split(/\n(?=#{2,4}\s+|\d+[\.)]\s+|[-*•]\s+)/);
      
      for (const subSection of subSections) {
        if (subSection.trim().length > 50) {
          chunks.push({
            content: `[${phase}] ${subSection.trim()}`,
            metadata: {
              documentType: docType,
              section: phase,
              entites: extractEntities(subSection),
              concepts: extractConcepts(subSection),
            },
          });
        }
      }
    }
  }
  
  return chunks.length > 0 ? chunks : chunkByParagraph(text, docType);
};

/**
 * Chunking par paragraphe (fallback)
 */
const chunkByParagraph = (text: string, docType: DocumentType): StructuredChunk[] => {
  const paragraphs = text
    .split(/\n\n+/)
    .map(p => p.trim())
    .filter(p => p.length > 100); // Au moins 100 caractères pour être significatif
  
  return paragraphs.map(paragraph => ({
    content: paragraph,
    metadata: {
      documentType: docType,
      axe: detectAxe(paragraph),
      entites: extractEntities(paragraph),
      concepts: extractConcepts(paragraph),
    },
  }));
};

/**
 * Génère des chunks simples (pour compatibilité avec l'ancien système)
 */
const generateChunks = (input: string): string[] => {
  const structuredChunks = generateStructuredChunks(input);
  return structuredChunks.map(chunk => chunk.content);
};

/**
 * Génère des embeddings pour un texte donné avec métadonnées structurées
 * Traite les chunks en batches de 100 maximum pour respecter les limites API
 * Retourne un tableau d'objets {content, embedding, metadata}
 */
export const generateEmbeddings = async (
  value: string
): Promise<Array<{ embedding: number[]; content: string; metadata: ChunkMetadata }>> => {
  const structuredChunks = generateStructuredChunks(value);

  // L'API Google AI limite à 100 embeddings par batch
  const BATCH_SIZE = 100;
  const results: Array<{ embedding: number[]; content: string; metadata: ChunkMetadata }> = [];

  // Traiter les chunks en batches
  for (let i = 0; i < structuredChunks.length; i += BATCH_SIZE) {
    const batch = structuredChunks.slice(i, i + BATCH_SIZE);
    const batchContents = batch.map(chunk => chunk.content);
    
    console.log(`Traitement du batch ${Math.floor(i / BATCH_SIZE) + 1}/${Math.ceil(structuredChunks.length / BATCH_SIZE)} (${batch.length} chunks)`);

    try {
      const { embeddings: batchEmbeddings } = await embedMany({
        model: embeddingModel,
        values: batchContents,
      });

      // Ajouter les résultats du batch avec métadonnées
      batchEmbeddings.forEach((embedding: number[], index: number) => {
        results.push({
          content: batch[index].content,
          embedding: embedding,
          metadata: batch[index].metadata,
        });
      });
    } catch (error) {
      console.error(`Erreur lors du traitement du batch ${Math.floor(i / BATCH_SIZE) + 1}:`, error);
      // Continuer avec les autres batches même si un échoue
    }
  }

  console.log(`✅ Génération terminée: ${results.length} chunks avec métadonnées`);
  console.log(`   Types de documents: ${[...new Set(results.map(r => r.metadata.documentType))].join(", ")}`);
  console.log(`   Axes identifiés: ${[...new Set(results.map(r => r.metadata.axe).filter(Boolean))].join(", ")}`);
  
  return results;
};

/**
 * Génère un embedding pour une seule requête (pour la recherche)
 */
export const generateEmbedding = async (value: string): Promise<number[]> => {
  const input = value.replaceAll("\n", " ");
  const { embedding } = await embed({
    model: embeddingModel,
    value: input,
    experimental_telemetry: getVercelTelemetry({
      functionId: "generate-single-embedding",
      metadata: {
        inputLength: input.length,
      },
    }),
  });
  return embedding;
};

/**
 * Options de filtrage pour la recherche sémantique
 */
export interface SearchFilters {
  documentType?: DocumentType | DocumentType[];
  axe?: AxeMaturite | AxeMaturite[];
  niveau?: NiveauMaturite;
  entites?: string[];
  concepts?: string[];
}

/**
 * Recherche sémantique intelligente dans la base de connaissances
 * @param userQuery - La requête de l'utilisateur
 * @param limit - Nombre de résultats à retourner (défaut: 15)
 * @param similarityThreshold - Seuil de similarité (défaut: 0.3)
 * @param filters - Filtres optionnels par métadonnées
 * @returns Array de résultats avec contenu, métadonnées et score de similarité
 */
export const findRelevantContent = async (
  userQuery: string,
  limit = 15,
  similarityThreshold = 0.3,
  filters?: SearchFilters
): Promise<Array<{ content: string; similarity: number; metadata?: any }>> => {
  try {
    const startTime = Date.now();
    console.log('[findRelevantContent] ====== DÉBUT ======');
    console.log('[findRelevantContent] Query (truncated):', userQuery.substring(0, 200));
    console.log('[findRelevantContent] Limit:', limit, 'Threshold:', similarityThreshold);
    console.log('[findRelevantContent] Filters:', JSON.stringify(filters || {}));
    
    const userQueryEmbedded = await generateEmbedding(userQuery);
    console.log('[findRelevantContent] Embedding generated with dimensions:', userQueryEmbedded.length);
    // Log a short preview of the embedding vector (first 8 floats) for quick sanity checks
    try {
      console.log('[findRelevantContent] Embedding preview:', userQueryEmbedded.slice(0, 8).map(v => Number(v).toFixed(6)).join(', '));
    } catch (e) {
      // ignore if preview fails
    }

    const similarity = sql<number>`1 - (${cosineDistance(
      embeddings.embedding,
      userQueryEmbedded
    )})`;

    let query = db
      .select({
        content: embeddings.content,
        metadata: embeddings.metadata,
        similarity,
      })
      .from(embeddings)
      .where(gt(similarity, similarityThreshold))
      .$dynamic();

    // Appliquer les filtres si fournis
    if (filters) {
      // Filtre par type de document
      if (filters.documentType) {
        const types = Array.isArray(filters.documentType) ? filters.documentType : [filters.documentType];
        query = query.where(
          sql`${embeddings.metadata}->>'documentType' = ANY(${types})`
        );
      }

      // Filtre par axe de maturité
      if (filters.axe) {
        const axes = Array.isArray(filters.axe) ? filters.axe : [filters.axe];
        query = query.where(
          sql`${embeddings.metadata}->>'axe' = ANY(${axes})`
        );
      }

      // Filtre par niveau de maturité
      if (filters.niveau) {
        query = query.where(
          sql`${embeddings.metadata}->>'niveau' = ${filters.niveau}`
        );
      }

      // Filtre par entités (contient au moins une)
      if (filters.entites && filters.entites.length > 0) {
        query = query.where(
          sql`${embeddings.metadata}->'entites' ?| array[${sql.join(filters.entites.map(e => sql`${e}`), sql`, `)}]`
        );
      }

      // Filtre par concepts (contient au moins un)
      if (filters.concepts && filters.concepts.length > 0) {
        query = query.where(
          sql`${embeddings.metadata}->'concepts' ?| array[${sql.join(filters.concepts.map(c => sql`${c}`), sql`, `)}]`
        );
      }
    }

    console.log('[findRelevantContent] Exécution de la requête SQL...');
    const similarGuides = await query
      .orderBy(desc(similarity))
      .limit(limit);

    const duration = Date.now() - startTime;
    console.log('[findRelevantContent] ====== RÉSULTATS ======');
    console.log(`[findRelevantContent] Nombre de résultats: ${similarGuides.length} (query took ${duration}ms)`);

    if (similarGuides.length > 0) {
      console.log('[findRelevantContent] Top result:', {
        similarity: Number(similarGuides[0].similarity).toFixed(6),
        contentPreview: String(similarGuides[0].content).substring(0, 200).replace(/\n/g, ' ') + '...',
        metadataKeys: similarGuides[0].metadata ? Object.keys(similarGuides[0].metadata) : null
      });
    } else {
      console.log('[findRelevantContent] No rows returned by DB query. Possible causes: empty embeddings table, threshold too high, or DB access issue.');
    }

    if (filters) {
      console.log('[findRelevantContent] Filters applied:', JSON.stringify(filters));
    }

    // Return as-is, keeping similarity and metadata for callers
    return similarGuides.map(r => ({ content: r.content, similarity: Number(r.similarity), metadata: r.metadata }));
  } catch (error) {
    console.error("[findRelevantContent] ====== ERREUR ======");
    console.error("[findRelevantContent] Error finding relevant content:", error);
    console.error("[findRelevantContent] Stack:", error instanceof Error ? error.stack : 'N/A');
    return [];
  }
};
