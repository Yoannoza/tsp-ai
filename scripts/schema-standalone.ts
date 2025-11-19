/**
 * Schema standalone pour le script regenerate-embeddings
 * Ne contient QUE les définitions nécessaires, sans import de server-only
 */

import {
  index,
  jsonb,
  pgTable,
  text,
  timestamp,
  uuid,
  vector,
} from "drizzle-orm/pg-core";

export const knowledgeBase = pgTable("KnowledgeBase", {
  id: uuid("id").primaryKey().notNull().defaultRandom(),
  filename: text("filename").notNull(),
  filepath: text("filepath").notNull(),
  content: text("content").notNull(),
  createdAt: timestamp("createdAt").notNull().defaultNow(),
  updatedAt: timestamp("updatedAt").notNull().defaultNow(),
  uploadedBy: uuid("uploadedBy").notNull(),
});

export const embeddings = pgTable(
  "Embeddings",
  {
    id: uuid("id").primaryKey().notNull().defaultRandom(),
    knowledgeBaseId: uuid("knowledgeBaseId")
      .notNull()
      .references(() => knowledgeBase.id, { onDelete: "cascade" }),
    content: text("content").notNull(),
    embedding: vector("embedding", { dimensions: 768 }).notNull(),
    metadata: jsonb("metadata").$type<{
      documentType?: string;
      axe?: string;
      niveau?: string;
      chapitre?: string;
      section?: string;
      article?: string;
      entites?: string[];
      concepts?: string[];
      page?: number;
    }>(),
    createdAt: timestamp("createdAt").notNull().defaultNow(),
  },
  (table) => ({
    embeddingIndex: index("embeddingIndex").using(
      "hnsw",
      table.embedding.op("vector_cosine_ops")
    ),
  })
);
