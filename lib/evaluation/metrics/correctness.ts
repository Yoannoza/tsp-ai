/**
 * Correctness Metric
 * Evaluates if the generation includes all key facts from ground truth
 * and if every fact is factually supported
 */

import type { CorrectnessMetric, EvaluationSample } from '../types';
import type { GeminiJudge } from '../judges/gemini-judge';
import { CORRECTNESS_TEMPLATE } from '../prompts/templates';

export async function evaluateCorrectness(
  sample: EvaluationSample,
  judge: GeminiJudge
): Promise<CorrectnessMetric> {
  // Build enriched context with metadata
  let enrichedQuery = sample.query;
  if (sample.metadata) {
    const metaInfo = [
      sample.metadata.category && `Category: ${sample.metadata.category}`,
      sample.metadata.source && `Source: ${sample.metadata.source}`,
      sample.metadata.question_number && `Question #${sample.metadata.question_number}`
    ].filter(Boolean).join(' | ');
    
    if (metaInfo) {
      enrichedQuery = `${sample.query}\n[Metadata: ${metaInfo}]`;
    }
  }

  const variables = {
    query: enrichedQuery,
    generation: sample.generation,
    ground_truth: sample.ground_truth
  };

  const response = await judge.evaluate(CORRECTNESS_TEMPLATE, variables);

  return {
    score: response.score,
    reasoning: response.reasoning,
    key_facts_included: response.score > 0.7,
    factual_support: response.score > 0.5,
    metadata: {
      raw_response: response.raw_response,
      sample_metadata: sample.metadata
    }
  };
}
