/**
 * Script de test pour démontrer le chunking intelligent
 * 
 * Usage: npx tsx lib/ai/test-chunking.ts
 */

// Import direct des fonctions de chunking sans dépendances DB
import { readFileSync } from 'fs';
import { join } from 'path';

// Copie locale des types et fonctions pour éviter les imports server-only
enum DocumentType {
  GUIDE_BONNES_PRATIQUES = "guide_bonnes_pratiques",
  RAPPORT_MATURITE = "rapport_maturite",
  CODE_NUMERIQUE = "code_numerique",
  DECRET = "decret",
  LOI = "loi",
  STRATEGIE_NATIONALE = "strategie_nationale",
  GUIDE_ENTREPRENEUR = "guide_entrepreneur",
}

enum AxeMaturite {
  STRATEGIE = "strategie",
  VENTE_MARKETING = "vente_marketing",
  EXECUTION_PROJETS = "execution_projets",
  RESSOURCES_HUMAINES = "ressources_humaines",
  FINANCE_COMPTABILITE = "finance_comptabilite",
}

interface ChunkMetadata {
  documentType: DocumentType;
  axe?: AxeMaturite;
  niveau?: string;
  chapitre?: string;
  section?: string;
  article?: string;
  entites?: string[];
  concepts?: string[];
  page?: number;
}

interface StructuredChunk {
  content: string;
  metadata: ChunkMetadata;
}

// Fonctions de détection (copiées depuis embedding.ts)
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
  if (lowerText.includes("guide de l'entrepreneur digital")) {
    return DocumentType.GUIDE_ENTREPRENEUR;
  }
  
  return DocumentType.GUIDE_BONNES_PRATIQUES;
};

const detectAxe = (text: string): AxeMaturite | undefined => {
  const lowerText = text.toLowerCase();
  
  if (lowerText.includes("stratégie") || lowerText.includes("vision")) return AxeMaturite.STRATEGIE;
  if (lowerText.includes("vente") || lowerText.includes("marketing")) return AxeMaturite.VENTE_MARKETING;
  if (lowerText.includes("exécution") || lowerText.includes("gestion de projet")) return AxeMaturite.EXECUTION_PROJETS;
  if (lowerText.includes("ressources humaines") || lowerText.includes("recrutement")) return AxeMaturite.RESSOURCES_HUMAINES;
  if (lowerText.includes("finance") || lowerText.includes("comptabilité")) return AxeMaturite.FINANCE_COMPTABILITE;
  
  return undefined;
};

const extractEntities = (text: string): string[] => {
  const entities: string[] = [];
  const lowerText = text.toLowerCase();
  
  if (lowerText.includes("esn")) entities.push("ESN");
  if (lowerText.includes("startup")) entities.push("Startup");
  if (lowerText.includes("asin")) entities.push("ASIN");
  if (lowerText.includes("arcep")) entities.push("ARCEP");
  if (lowerText.includes("ministère")) entities.push("Ministère");
  
  return entities;
};

const extractConcepts = (text: string): string[] => {
  const concepts: string[] = [];
  const lowerText = text.toLowerCase();
  
  if (lowerText.includes("intelligence artificielle") || lowerText.includes(" ia ") || lowerText.includes("l'ia")) concepts.push("IA");
  if (lowerText.includes("cybersécurité")) concepts.push("Cybersécurité");
  if (lowerText.includes("due diligence")) concepts.push("Due Diligence");
  if (lowerText.includes("kpi")) concepts.push("KPI");
  if (lowerText.includes("b2g")) concepts.push("B2G");
  
  return concepts;
};

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
  
  return chunks;
};

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
  
  return chunks;
};

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
  
  return chunks;
};

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
    
    default:
      return [];
  }
};

// Exemples de documents pour tester le chunking

const exampleLegalDocument = `
TSP Algorithms Overview

Chapter I: Exact Algorithms

Article 1: The Held-Karp algorithm is a dynamic programming algorithm that solves the Traveling Salesperson Problem in O(n^2 * 2^n) time.

Article 2: Branch and Bound methods can be used to solve TSP by exploring the state space tree.

Chapter II: Heuristics

Article 3: The Nearest Neighbor heuristic is a greedy algorithm that selects the nearest unvisited city.

Article 407: Les administrations publiques doivent désigner un Chief Data Officer (CDO) responsable de la gouvernance des données et de l'IA.

Article 408: Les algorithmes d'IA utilisés dans les décisions administratives doivent être auditables et explicables.
`;

const exampleGuideDocument = `
Guide des Bonnes Pratiques des ESN Béninoises

## Axe 1: Stratégie

### Niveau Avancé - Bonnes Pratiques

- Définir une vision claire et des objectifs stratégiques alignés sur le marché B2G
- Mettre en place un système de veille concurrentielle pour identifier les opportunités
- Développer des partenariats stratégiques avec les institutions publiques

## Axe 2: Vente & Marketing

### Niveau Établi - Bonnes Pratiques

- Former les équipes commerciales sur les spécificités du marché B2G
- Créer des cas d'usage démontrant la valeur ajoutée pour l'administration publique
- Participer activement aux appels d'offres publics

## Axe 3: Ressources Humaines

### Bonnes Pratiques pour le Recrutement

- Mettre en place un processus de recrutement structuré avec des critères clairs
- Développer une marque employeur attractive pour attirer les talents
- Créer des programmes de formation continue pour monter en compétences
- Établir des KPI de performance pour suivre la productivité des équipes
`;

const exampleStrategyDocument = `
Stratégie Nationale d'Intelligence Artificielle et des Mégadonnées (SNIAM)

Programme 1: Infrastructure et Gouvernance

Action 1.2: Mise en place d'un cadre réglementaire pour l'IA
Conformément aux articles 406, 407 et 408 du Code du Numérique, cette action vise à établir les règles et standards pour le déploiement responsable de l'IA dans les administrations publiques.

Programme 4: Applications et Services IA

Action 4.3: Développement de solutions d'IA pour la cybersécurité
Cette action concerne le déploiement de systèmes d'IA pour la détection des menaces et la protection des infrastructures critiques. Les ESN spécialisées en cybersécurité seront mobilisées.

Action 4.5: Solutions d'analyse de données pour la prise de décision
Mise en œuvre d'outils d'analyse de mégadonnées pour améliorer la prise de décision dans les ministères. Nécessite des compétences en data science et en architecture de données.
`;

async function testChunking() {
  console.log("🧪 Test du Chunking Intelligent\n");
  console.log("=".repeat(80));

  // Test 1: Document légal
  console.log("\n📜 Test 1: Code du Numérique (Document Légal)\n");
  const legalEmbeddings = generateStructuredChunks(exampleLegalDocument);
  console.log(`   Chunks générés: ${legalEmbeddings.length}`);
  legalEmbeddings.forEach((chunk, i) => {
    console.log(`\n   Chunk ${i + 1}:`);
    console.log(`   Type: ${chunk.metadata.documentType}`);
    console.log(`   Article: ${chunk.metadata.article || 'N/A'}`);
    console.log(`   Chapitre: ${chunk.metadata.chapitre || 'N/A'}`);
    console.log(`   Concepts: ${chunk.metadata.concepts?.join(', ') || 'N/A'}`);
    console.log(`   Contenu: ${chunk.content.substring(0, 100)}...`);
  });

  // Test 2: Guide des bonnes pratiques
  console.log("\n\n📘 Test 2: Guide des Bonnes Pratiques\n");
  const guideEmbeddings = generateStructuredChunks(exampleGuideDocument);
  console.log(`   Chunks générés: ${guideEmbeddings.length}`);
  guideEmbeddings.forEach((chunk, i) => {
    console.log(`\n   Chunk ${i + 1}:`);
    console.log(`   Type: ${chunk.metadata.documentType}`);
    console.log(`   Axe: ${chunk.metadata.axe || 'N/A'}`);
    console.log(`   Section: ${chunk.metadata.section || 'N/A'}`);
    console.log(`   Concepts: ${chunk.metadata.concepts?.join(', ') || 'N/A'}`);
    console.log(`   Contenu: ${chunk.content.substring(0, 100)}...`);
  });

  // Test 3: Stratégie nationale
  console.log("\n\n📊 Test 3: Stratégie Nationale IA\n");
  const strategyEmbeddings = generateStructuredChunks(exampleStrategyDocument);
  console.log(`   Chunks générés: ${strategyEmbeddings.length}`);
  strategyEmbeddings.forEach((chunk, i) => {
    console.log(`\n   Chunk ${i + 1}:`);
    console.log(`   Type: ${chunk.metadata.documentType}`);
    console.log(`   Section: ${chunk.metadata.section || 'N/A'}`);
    console.log(`   Entités: ${chunk.metadata.entites?.join(', ') || 'N/A'}`);
    console.log(`   Concepts: ${chunk.metadata.concepts?.join(', ') || 'N/A'}`);
    console.log(`   Contenu: ${chunk.content.substring(0, 100)}...`);
  });

  console.log("\n" + "=".repeat(80));
  console.log("\n✅ Tests de chunking terminés!\n");
  console.log("Avantages du nouveau système:");
  console.log("  ✓ Chunks basés sur la structure sémantique (articles, sections, actions)");
  console.log("  ✓ Métadonnées riches pour filtrage intelligent");
  console.log("  ✓ Détection automatique du type de document");
  console.log("  ✓ Extraction des entités et concepts clés");
  console.log("  ✓ Support du filtrage par axe de maturité, type de document, etc.");
  console.log("\n📊 Statistiques:");
  console.log(`  - Documents légaux: ${legalEmbeddings.length} chunks (par article)`);
  console.log(`  - Guides pratiques: ${guideEmbeddings.length} chunks (par bonne pratique)`);
  console.log(`  - Stratégies: ${strategyEmbeddings.length} chunks (par action)`);
  console.log("\nVS ancien système: ~${Math.ceil((exampleLegalDocument.length + exampleGuideDocument.length + exampleStrategyDocument.length) / 500)} chunks arbitraires de 500 mots\n");
}

// Exécuter les tests
testChunking().catch(console.error);
