import {
  index,
  pgTable,
  text,
  timestamp,
  varchar,
  vector,
} from "drizzle-orm/pg-core";
import { generateUUID } from "@/lib/utils";
import { user } from "../schema";

export const knowledgeBase = pgTable("KnowledgeBase", {
  id: varchar("id", { length: 191 })
    .primaryKey()
    .$defaultFn(() => generateUUID()),
  filename: text("filename").notNull(),
  filepath: text("filepath").notNull(),
  content: text("content").notNull(),
  createdAt: timestamp("createdAt").notNull().defaultNow(),
  updatedAt: timestamp("updatedAt").notNull().defaultNow(),
  uploadedBy: varchar("uploadedBy", { length: 191 })
    .notNull()
    .references(() => user.id),
});

export const embeddings = pgTable(
  "Embeddings",
  {
    id: varchar("id", { length: 191 })
      .primaryKey()
      .$defaultFn(() => generateUUID()),
    knowledgeBaseId: varchar("knowledgeBaseId", { length: 191 })
      .notNull()
      .references(() => knowledgeBase.id, { onDelete: "cascade" }),
    content: text("content").notNull(),
    embedding: vector("embedding", { dimensions: 768 }).notNull(), // Google embeddings: 768 dimensions
    createdAt: timestamp("createdAt").notNull().defaultNow(),
  },
  (table) => ({
    embeddingIndex: index("embeddingIndex").using(
      "hnsw",
      table.embedding.op("vector_cosine_ops")
    ),
  })
);

export type KnowledgeBase = typeof knowledgeBase.$inferSelect;
export type NewKnowledgeBase = typeof knowledgeBase.$inferInsert;
export type Embedding = typeof embeddings.$inferSelect;
export type NewEmbedding = typeof embeddings.$inferInsert;
