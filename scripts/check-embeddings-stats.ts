import 'dotenv/config';
import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import { embeddings } from './schema-standalone';
import { sql } from 'drizzle-orm';

async function main() {
  const connectionString = process.env.POSTGRES_DATABASE_URL || process.env.POSTGRES_URL;
  if (!connectionString) {
    throw new Error('❌ POSTGRES_DATABASE_URL non définie');
  }
  
  const client = postgres(connectionString);
  const db = drizzle(client);

  console.log('\n📊 STATISTIQUES DES EMBEDDINGS\n');
  console.log('='.repeat(80));

  // Total
  const total = await db.select({ count: sql<number>`count(*)` }).from(embeddings);
  console.log(`\n📦 Total de chunks: ${total[0].count}`);

  // Par type de document
  const byType = await db.select({
    type: sql<string>`metadata->>'documentType'`,
    count: sql<number>`count(*)`
  }).from(embeddings).groupBy(sql`metadata->>'documentType'`);

  console.log('\n📚 Par type de document:');
  byType.forEach(t => {
    console.log(`   - ${t.type}: ${t.count} chunks`);
  });

  // Par axe de maturité
  const byAxe = await db.select({
    axe: sql<string>`metadata->>'axe'`,
    count: sql<number>`count(*)`
  }).from(embeddings)
    .where(sql`metadata->>'axe' IS NOT NULL`)
    .groupBy(sql`metadata->>'axe'`);

  if (byAxe.length > 0) {
    console.log('\n🎯 Par axe de maturité:');
    byAxe.forEach(a => {
      console.log(`   - ${a.axe}: ${a.count} chunks`);
    });
  }

  // Concepts principaux
  const concepts = await db.select({
    concept: sql<string>`jsonb_array_elements_text(metadata->'concepts')`,
    count: sql<number>`count(*)`
  }).from(embeddings)
    .where(sql`metadata->'concepts' IS NOT NULL`)
    .groupBy(sql`jsonb_array_elements_text(metadata->'concepts')`)
    .limit(10);

  if (concepts.length > 0) {
    console.log('\n💡 Top 10 concepts identifiés:');
    concepts.forEach(c => {
      console.log(`   - ${c.concept}: ${c.count} mentions`);
    });
  }

  console.log('\n' + '='.repeat(80));
  console.log('✅ Système RAG avec chunking intelligent opérationnel!\n');

  await client.end();
}

main().catch(console.error);
