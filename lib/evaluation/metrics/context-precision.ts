/**
 * Context Precision Metric
 * Verifies if the context was useful in arriving at the given answer
 */

import type { ContextPrecisionMetric, EvaluationSample } from '../types';
import type { GeminiJudge } from '../judges/gemini-judge';
import { CONTEXT_PRECISION_TEMPLATE } from '../prompts/templates';

export async function evaluateContextPrecision(
  sample: EvaluationSample,
  judge: GeminiJudge
): Promise<ContextPrecisionMetric> {
  // Use metadata as context if no explicit context provided
  let context = sample.context;
  
  if (!context && sample.metadata) {
    // Build context from metadata
    const metadataContext = [
      sample.metadata.category && `Topic: ${sample.metadata.category}`,
      sample.metadata.source && `Source Document: ${sample.metadata.source}`,
      sample.metadata.question_number && `Question Number: ${sample.metadata.question_number}`
    ].filter(Boolean).join('\n');
    
    context = metadataContext || 'No context available';
  }

  if (!context) {
    return {
      score: 0.5, // Neutral score when no context
      reasoning: 'No context or metadata available for evaluation. Assuming neutral relevance.',
      context_useful: false,
      context_relevant: false,
      metadata: {
        had_context: false,
        used_metadata: !!sample.metadata
      }
    };
  }

  const variables = {
    question: sample.query,
    answer: sample.generation, // Use generation instead of answer
    context: context
  };

  const response = await judge.evaluate(CONTEXT_PRECISION_TEMPLATE, variables);

  return {
    score: response.score,
    reasoning: response.reasoning,
    context_useful: response.score > 0.6,
    context_relevant: response.score > 0.4,
    metadata: {
      raw_response: response.raw_response,
      had_explicit_context: !!sample.context,
      used_metadata_as_context: !sample.context && !!sample.metadata,
      sample_metadata: sample.metadata
    }
  };
}
