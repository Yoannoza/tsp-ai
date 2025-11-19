import 'dotenv/config';
import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import { embeddings, knowledgeBase } from './schema-standalone';
import { generateEmbeddings } from '@/lib/ai/embedding-standalone';
import { readFile, readdir } from 'fs/promises';
import { join } from 'path';

/**
 * Script pour régénérer tous les embeddings avec le chunking intelligent
 * Usage: npx tsx scripts/regenerate-embeddings.ts
 */

async function main() {
  console.log('🚀 Début de la régénération des embeddings...\n');

  // Connexion directe à la base de données (évite server-only)
  const connectionString = process.env.POSTGRES_DATABASE_URL || process.env.POSTGRES_URL;
  if (!connectionString) {
    throw new Error('❌ POSTGRES_DATABASE_URL ou POSTGRES_URL non définie dans .env.local');
  }
  
  const client = postgres(connectionString);
  const db = drizzle(client);

  // 1. Supprimer tous les anciens embeddings
  console.log('🗑️  Suppression des anciens embeddings...');
  await db.delete(embeddings);
  console.log(`✅ Anciens embeddings supprimés\n`);

  // 2. Créer ou récupérer une entrée KnowledgeBase pour les documents
  console.log('📚 Vérification de la base de connaissances...');
  
  // D'abord chercher si une entrée existe
  let kbEntry = await db.select().from(knowledgeBase).limit(1);
  
  let knowledgeBaseId: string;
  
  if (kbEntry.length === 0) {
    // Créer une nouvelle entrée KnowledgeBase
    console.log('   Création d\'une nouvelle base de connaissances...');
    const [newKb] = await db.insert(knowledgeBase).values({
      filename: 'TSP Documentation',
      filepath: 'Documentation/',
      content: 'Knowledge base about Traveling Salesperson Problem algorithms and heuristics.',
      uploadedBy: '00000000-0000-0000-0000-000000000000', // ID factice pour le système
    }).returning();
    knowledgeBaseId = newKb.id;
    console.log(`   ✅ Base créée avec ID: ${knowledgeBaseId}`);
  } else {
    knowledgeBaseId = kbEntry[0].id;
    console.log(`   ✅ Utilisation de la base existante: ${knowledgeBaseId}`);
  }
  console.log('');

  // 3. Lire tous les documents du dossier Documentation/
  const docsPath = join(process.cwd(), 'Documentation');
  console.log(`📁 Lecture des documents depuis: ${docsPath}`);
  
  const files = await readdir(docsPath);
  const mdFiles = files.filter(f => f.endsWith('.md'));
  
  console.log(`📄 ${mdFiles.length} fichiers Markdown trouvés:\n`);
  mdFiles.forEach((f, i) => console.log(`   ${i + 1}. ${f}`));
  console.log('');

  // 4. Générer les embeddings pour chaque document
  let totalChunks = 0;
  
  for (const file of mdFiles) {
    const filePath = join(docsPath, file);
    console.log(`\n📝 Traitement: ${file}`);
    console.log('─'.repeat(80));
    
    try {
      const content = await readFile(filePath, 'utf-8');
      
      // Utiliser generateEmbeddings() de lib/ai/embedding.ts
      // Cette fonction fait TOUT : chunking intelligent + génération d'embeddings
      const results = await generateEmbeddings(content);
      
      console.log(`✅ ${results.length} chunks générés avec embeddings`);
      
      // Insérer dans la base de données
      if (results.length > 0) {
        await db.insert(embeddings).values(
          results.map(r => ({
            knowledgeBaseId: knowledgeBaseId,
            content: r.content,
            embedding: r.embedding,
            metadata: r.metadata,
          }))
        );
        
        console.log(`💾 ${results.length} embeddings insérés dans la DB`);
        
        // Afficher un aperçu
        console.log('\n   📊 Aperçu:');
        results.slice(0, 2).forEach((r, i) => {
          console.log(`      ${i + 1}. Type: ${r.metadata.documentType}`);
          console.log(`         Axe: ${r.metadata.axe || 'N/A'}`);
          console.log(`         Section: ${r.metadata.section?.substring(0, 40) || 'N/A'}...`);
          console.log(`         Contenu: ${r.content.substring(0, 60)}...`);
        });
      }
      
      totalChunks += results.length;
      
    } catch (error) {
      console.error(`❌ Erreur lors du traitement de ${file}:`, error);
      console.error(error);
    }
  }

  // 5. Résumé final
  console.log('\n' + '='.repeat(80));
  console.log('✨ RÉGÉNÉRATION TERMINÉE');
  console.log('='.repeat(80));
  console.log(`📚 Documents traités: ${mdFiles.length}`);
  console.log(`🧩 Total de chunks créés: ${totalChunks}`);
  console.log(`💾 Embeddings stockés dans la base de données`);
  console.log('\n✅ Système RAG prêt avec chunking intelligent structuré!\n');
  
  // Fermer la connexion
  await client.end();
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error('❌ Erreur fatale:', error);
    process.exit(1);
  });
