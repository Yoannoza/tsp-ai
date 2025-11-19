/**
 * Faithfulness Metric
 * Analyzes answer complexity and breaks it down into verifiable statements
 */

import type { FaithfulnessMetric, EvaluationSample } from '../types';
import type { GeminiJudge } from '../judges/gemini-judge';
import { FAITHFULNESS_TEMPLATE } from '../prompts/templates';

export async function evaluateFaithfulness(
  sample: EvaluationSample,
  judge: GeminiJudge
): Promise<FaithfulnessMetric> {
  // Build context from metadata if available
  let context = sample.context;
  if (!context && sample.metadata) {
    const metadataContext = [
      sample.metadata.category && `Topic: ${sample.metadata.category}`,
      sample.metadata.source && `Reference: ${sample.metadata.source}`
    ].filter(Boolean).join('\n');
    context = metadataContext;
  }

  // Build enriched question with metadata info
  let enrichedQuestion = sample.query;
  if (sample.metadata?.question_number) {
    enrichedQuestion = `[Question #${sample.metadata.question_number}] ${sample.query}`;
  }

  const variables = {
    question: enrichedQuestion,
    answer: sample.generation,
    context: context || 'No additional context provided'
  };

  const response = await judge.evaluate(FAITHFULNESS_TEMPLATE, variables);

  // Parse statements from reasoning if possible
  const statements: string[] = [];
  const statementMatches = response.reasoning.match(/\d+\.\s+(.+?)(?=\n\d+\.|$)/gs);
  if (statementMatches) {
    statements.push(...statementMatches.map(s => s.trim()));
  }

  const totalStatements = statements.length || 10; // Fallback to estimate
  const faithfulStatements = Math.round(response.score * totalStatements);

  return {
    score: response.score,
    reasoning: response.reasoning,
    statements: statements,
    faithful_statements: faithfulStatements,
    total_statements: totalStatements,
    metadata: {
      raw_response: response.raw_response,
      used_metadata_context: !sample.context && !!sample.metadata,
      sample_metadata: sample.metadata,
      is_faithful: response.score > 0.7
    }
  };
}
