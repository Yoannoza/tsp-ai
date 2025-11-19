import type { InferSelectModel } from "drizzle-orm";
import { index, pgTable, text, timestamp, uuid, real } from "drizzle-orm/pg-core";
import { knowledgeBase } from "./schema";

/**
 * Table pour logger les requêtes RAG
 */
export const ragQuery = pgTable(
  "RagQuery",
  {
    id: uuid("id").primaryKey().notNull().defaultRandom(),
    query: text("query").notNull(),
    resultCount: text("resultCount").notNull(),
    avgSimilarity: real("avgSimilarity"),
    executionTime: text("executionTime").notNull(), // en ms
    createdAt: timestamp("createdAt").notNull().defaultNow(),
    userId: uuid("userId"),
  },
  (table) => ({
    createdAtIndex: index("ragQueryCreatedAtIndex").on(table.createdAt),
    userIdIndex: index("ragQueryUserIdIndex").on(table.userId),
  })
);

export type RagQuery = InferSelectModel<typeof ragQuery>;

/**
 * Table pour logger les documents cités dans les réponses
 */
export const ragCitation = pgTable(
  "RagCitation",
  {
    id: uuid("id").primaryKey().notNull().defaultRandom(),
    ragQueryId: uuid("ragQueryId")
      .notNull()
      .references(() => ragQuery.id, { onDelete: "cascade" }),
    knowledgeBaseId: uuid("knowledgeBaseId")
      .notNull()
      .references(() => knowledgeBase.id, { onDelete: "cascade" }),
    similarity: real("similarity").notNull(),
    createdAt: timestamp("createdAt").notNull().defaultNow(),
  },
  (table) => ({
    ragQueryIdIndex: index("ragCitationQueryIdIndex").on(table.ragQueryId),
    knowledgeBaseIdIndex: index("ragCitationKbIdIndex").on(table.knowledgeBaseId),
  })
);

export type RagCitation = InferSelectModel<typeof ragCitation>;
