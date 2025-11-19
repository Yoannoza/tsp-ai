/**
 * Answer Relevance Metric
 * Generates a question for the answer and identifies if answer is noncommittal
 */

import type { AnswerRelevanceMetric, EvaluationSample } from '../types';
import type { GeminiJudge } from '../judges/gemini-judge';
import { ANSWER_RELEVANCE_TEMPLATE } from '../prompts/templates';

export async function evaluateAnswerRelevance(
  sample: EvaluationSample,
  judge: GeminiJudge
): Promise<AnswerRelevanceMetric> {
  // Build enriched context with metadata
  let enrichedQuery = sample.query;
  if (sample.metadata) {
    const metaInfo = [
      sample.metadata.category && `Category: ${sample.metadata.category}`,
      sample.metadata.source && `Source: ${sample.metadata.source}`
    ].filter(Boolean).join(' | ');
    
    if (metaInfo) {
      enrichedQuery = `${sample.query}\n[Context: ${metaInfo}]`;
    }
  }

  const variables = {
    question: enrichedQuery,
    answer: sample.generation
  };

  const response = await judge.evaluate(ANSWER_RELEVANCE_TEMPLATE, variables);

  return {
    score: response.score,
    reasoning: response.reasoning,
    noncommittal: response.score < 0.4 ? 1 : 0, // Binary flag for evasive answers
    metadata: {
      raw_response: response.raw_response,
      sample_metadata: sample.metadata,
      is_relevant: response.score > 0.6,
      has_evasive_language: response.score < 0.4
    }
  };
}
