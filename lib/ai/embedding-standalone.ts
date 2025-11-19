/**
 * Version standalone de generateEmbeddings pour les scripts
 * N'utilise PAS de dépendances server-only
 */

import { embed, embedMany } from "ai";
import { google } from "@ai-sdk/google";

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
 * Métadonnées pour un chunk
 */
export interface ChunkMetadata {
  documentType: DocumentType;
  axe?: AxeMaturite;
  chapitre?: string;
  section?: string;
  article?: string;
  entites?: string[];
  concepts?: string[];
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
  
  if (lowerText.includes("tsp") || lowerText.includes("traveling salesperson")) {
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
  
  return DocumentType.GUIDE_BONNES_PRATIQUES;
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
 * Découpe un document légal par articles
 */
const chunkLegalDocument = (text: string, docType: DocumentType): StructuredChunk[] => {
  const chunks: StructuredChunk[] = [];
  
  const articleRegex = /(?:Article|Art\.?)\s+(\d+)[:\s\-.]+(.*?)(?=(?:Article|Art\.?)\s+\d+|$)/gis;
  
  let match;
  let currentChapitre = "";
  
  while ((match = articleRegex.exec(text)) !== null) {
    const articleNum = match[1];
    const content = match[2].trim();
    
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
  
  return chunks.length > 0 ? chunks : chunkByParagraph(text, docType);
};

/**
 * Découpe un guide par sections et bonnes pratiques
 */
const chunkGuideDocument = (text: string, docType: DocumentType): StructuredChunk[] => {
  const chunks: StructuredChunk[] = [];
  
  const sections = text.split(/(?=^#{1,3}\s+)/m);
  
  for (const section of sections) {
    if (section.trim().length < 50) continue;
    
    const titleMatch = section.match(/^#{1,3}\s+(.+?)$/m);
    const sectionTitle = titleMatch ? titleMatch[1].trim() : "";
    
    const axe = detectAxe(section);
    
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
  
  const phases = ["Idéation", "Pré-amorçage", "Amorçage", "Croissance", "Expansion"];
  
  for (const phase of phases) {
    const phaseRegex = new RegExp(`(?:${phase}|${phase.toUpperCase()})[:\\s\\-]+([^]*?)(?=${phases.join("|")}|$)`, "i");
    const match = text.match(phaseRegex);
    
    if (match && match[1]) {
      const phaseContent = match[1].trim();
      
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
    .filter(p => p.length > 100);
  
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
 * Chunking intelligent basé sur la structure du document
 */
const generateStructuredChunks = (input: string): StructuredChunk[] => {
  const documentType = detectDocumentType(input);
  
  switch (documentType) {
    case DocumentType.CODE_NUMERIQUE:
    case DocumentType.LOI:
    case DocumentType.DECRET:
      return chunkLegalDocument(input, documentType);
    
    case DocumentType.GUIDE_BONNES_PRATIQUES:
    case DocumentType.RAPPORT_MATURITE:
      return chunkGuideDocument(input, documentType);
    
    case DocumentType.STRATEGIE_NATIONALE:
      return chunkStrategyDocument(input, documentType);
    
    case DocumentType.GUIDE_ENTREPRENEUR:
      return chunkEntrepreneurGuide(input, documentType);
    
    default:
      return chunkByParagraph(input, documentType);
  }
};

/**
 * Génère des embeddings pour un texte donné avec métadonnées structurées
 * VERSION STANDALONE pour scripts (sans dépendance sur db)
 */
export const generateEmbeddings = async (
  value: string
): Promise<Array<{ embedding: number[]; content: string; metadata: ChunkMetadata }>> => {
  const structuredChunks = generateStructuredChunks(value);

  const BATCH_SIZE = 100;
  const results: Array<{ embedding: number[]; content: string; metadata: ChunkMetadata }> = [];

  for (let i = 0; i < structuredChunks.length; i += BATCH_SIZE) {
    const batch = structuredChunks.slice(i, i + BATCH_SIZE);
    const batchContents = batch.map(chunk => chunk.content);
    
    console.log(`   Batch ${Math.floor(i / BATCH_SIZE) + 1}/${Math.ceil(structuredChunks.length / BATCH_SIZE)} (${batch.length} chunks)`);

    try {
      const { embeddings: batchEmbeddings } = await embedMany({
        model: embeddingModel,
        values: batchContents,
      });

      batchEmbeddings.forEach((embedding: number[], index: number) => {
        results.push({
          content: batch[index].content,
          embedding: embedding,
          metadata: batch[index].metadata,
        });
      });
    } catch (error) {
      console.error(`   ❌ Erreur batch ${Math.floor(i / BATCH_SIZE) + 1}:`, error);
    }
  }

  console.log(`   ✅ ${results.length} chunks avec métadonnées générés`);
  
  return results;
};
