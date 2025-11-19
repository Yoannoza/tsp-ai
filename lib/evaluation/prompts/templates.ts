/**
 * Prompt templates for evaluation metrics
 * Based on user-provided metric definitions
 */

import type { PromptTemplate, JudgeResponse } from '../types';

// ============================================================================
// Parser Helpers
// ============================================================================

/**
 * Extract score from Gemini response
 * Looks for patterns like "Score: 0.8" or "score: 0.8" or just "0.8"
 */
function extractScore(text: string): number {
  // Try to find "Score: X" pattern
  const scoreMatch = text.match(/score[:\s]+([0-9]*\.?[0-9]+)/i);
  if (scoreMatch) {
    return parseFloat(scoreMatch[1]);
  }

  // Try to find standalone number between 0 and 1
  const numberMatch = text.match(/\b(0\.[0-9]+|1\.0|1)\b/);
  if (numberMatch) {
    return parseFloat(numberMatch[1]);
  }

  // Default to 0 if no score found
  console.warn('Could not extract score from response:', text);
  return 0;
}

/**
 * Extract reasoning from Gemini response
 * Takes the text after "Reasoning:" or "Explanation:"
 */
function extractReasoning(text: string): string {
  const reasoningMatch = text.match(/(?:reasoning|explanation)[:\s]+(.+)/is);
  if (reasoningMatch) {
    return reasoningMatch[1].trim();
  }
  
  // If no explicit reasoning section, return the whole text
  return text.trim();
}

// ============================================================================
// Correctness Metric Template
// ============================================================================

export const CORRECTNESS_TEMPLATE: PromptTemplate = {
  name: 'Correctness',
  description: 'Evaluate the correctness of the generation on a continuous scale from 0 to 1',
  variables: ['query', 'generation', 'ground_truth'],
  template: `Evaluate the correctness of the generation on a continuous scale from 0 to 1. A generation can be considered correct (Score: 1) if it includes all the key facts from the ground truth and if every fact presented in the generation is factually supported by the ground truth or common sense.

Example:
Query: Can eating carrots improve your vision?
Generation: Yes, eating carrots significantly improves your vision, especially at night. This is why people who eat lots of carrots never need glasses. Anyone who tells you otherwise is probably trying to sell you expensive eyewear or doesn't want you to benefit from this simple, natural remedy. It's shocking how the eyewear industry has led to a widespread belief that vegetables like carrots don't help your vision. People are so gullible to fall for these money-making schemes.
Ground truth: Well, yes and no. Carrots won't improve your visual acuity if you have less than perfect vision. A diet of carrots won't give a blind person 20/20 vision. But, the vitamins found in the vegetable can help promote overall eye health. Carrots contain beta-carotene, a substance that the body converts to vitamin A, an important nutrient for eye health. An extreme lack of vitamin A can cause blindness. Vitamin A can prevent the formation of cataracts and macular degeneration, the world's leading cause of blindness. However, if your vision problems aren't related to vitamin A, your vision won't change no matter how many carrots you eat.
Score: 0.1
Reasoning: While the generation mentions that carrots can improve vision, it fails to outline the reason for this phenomenon and the circumstances under which this is the case. The rest of the response contains misinformation and exaggerations regarding the benefits of eating carrots for vision improvement. It deviates significantly from the more accurate and nuanced explanation provided in the ground truth.

Input:
Query: {{query}}
Generation: {{generation}}
Ground truth: {{ground_truth}}

Think step by step. Provide your evaluation in this format:
Score: [0.0 to 1.0]
Reasoning: [Your detailed explanation]`,
  
  parser: (response: string): JudgeResponse => {
    const score = extractScore(response);
    const reasoning = extractReasoning(response);
    
    return {
      score: Math.max(0, Math.min(1, score)), // Clamp between 0 and 1
      reasoning,
      raw_response: response
    };
  }
};

// ============================================================================
// Context Precision Metric Template
// ============================================================================

export const CONTEXT_PRECISION_TEMPLATE: PromptTemplate = {
  name: 'Context Precision',
  description: 'Verify if the context was useful in arriving at the given answer',
  variables: ['question', 'answer', 'context'],
  template: `Given question, answer and context verify if the context was useful in arriving at the given answer.

Evaluate on a scale from 0 to 1:
- Score 1.0: The context was highly useful and directly contributed to the answer
- Score 0.5: The context was partially useful but not essential
- Score 0.0: The context was not useful or irrelevant to the answer

Question: {{question}}
Answer: {{answer}}
Context: {{context}}

Think step by step. Consider:
1. Does the context contain information present in the answer?
2. Would the answer be possible without this context?
3. How much of the context was actually used?

Provide your evaluation in this format:
Score: [0.0 to 1.0]
Reasoning: [Your detailed explanation]`,
  
  parser: (response: string): JudgeResponse => {
    const score = extractScore(response);
    const reasoning = extractReasoning(response);
    
    return {
      score: Math.max(0, Math.min(1, score)),
      reasoning,
      raw_response: response
    };
  }
};

// ============================================================================
// Answer Relevance Metric Template
// ============================================================================

export const ANSWER_RELEVANCE_TEMPLATE: PromptTemplate = {
  name: 'Answer Relevance',
  description: 'Generate a question for the given answer and identify if answer is noncommittal',
  variables: ['answer'],
  template: `Generate a question for the given answer and identify if answer is noncommittal.

Give noncommittal as 1 if the answer is noncommittal and 0 if the answer is committal. A noncommittal answer is one that is evasive, vague, or ambiguous. For example, 'I don't know' or 'I'm not sure' are noncommittal answers.

Answer: {{answer}}

Think step by step:
1. What question would this answer be responding to?
2. Is the answer direct and specific, or vague and evasive?
3. Does the answer provide concrete information or avoid commitment?

Calculate the relevance score (0 to 1):
- If noncommittal: score should be lower (0.0-0.4)
- If committal and relevant: score should be higher (0.6-1.0)

Provide your evaluation in this format:
Generated Question: [The question this answer would respond to]
Noncommittal: [0 or 1]
Score: [0.0 to 1.0]
Reasoning: [Your detailed explanation]`,
  
  parser: (response: string): JudgeResponse => {
    const score = extractScore(response);
    const reasoning = extractReasoning(response);
    
    // Extract generated question
    const questionMatch = response.match(/generated question[:\s]+(.+?)(?:\n|$)/i);
    const generatedQuestion = questionMatch ? questionMatch[1].trim() : '';
    
    // Extract noncommittal value
    const noncommittalMatch = response.match(/noncommittal[:\s]+([01])/i);
    const noncommittal = noncommittalMatch ? parseInt(noncommittalMatch[1]) : 0;
    
    return {
      score: Math.max(0, Math.min(1, score)),
      reasoning,
      raw_response: response,
      metadata: {
        generated_question: generatedQuestion,
        noncommittal
      }
    };
  }
};

// ============================================================================
// Faithfulness Metric Template
// ============================================================================

export const FAITHFULNESS_TEMPLATE: PromptTemplate = {
  name: 'Faithfulness',
  description: 'Analyze complexity and break down answer into verifiable statements',
  variables: ['question', 'answer'],
  template: `Given a question and an answer, analyze the complexity of each sentence in the answer. Break down each sentence into one or more fully understandable statements. Ensure that no pronouns are used in any statement.

Question: {{question}}
Answer: {{answer}}

Instructions:
1. Break down the answer into atomic statements
2. Replace all pronouns with their referents
3. Verify each statement for faithfulness to the original answer
4. Count total statements and faithful statements

Calculate faithfulness score:
Score = (Number of faithful statements) / (Total number of statements)

Provide your evaluation in this format:
Statements:
1. [First atomic statement]
2. [Second atomic statement]
...

Faithful Statements: [count]
Total Statements: [count]
Score: [0.0 to 1.0]
Reasoning: [Your detailed explanation]`,
  
  parser: (response: string): JudgeResponse => {
    const score = extractScore(response);
    const reasoning = extractReasoning(response);
    
    // Extract statements
    const statementsSection = response.match(/statements[:\s]+(.+?)(?:faithful|score|reasoning)/is);
    const statements: string[] = [];
    
    if (statementsSection) {
      const statementText = statementsSection[1];
      const statementMatches = statementText.matchAll(/(?:^|\n)\s*\d+\.\s*(.+?)(?=\n\s*\d+\.|\n|$)/g);
      for (const match of statementMatches) {
        statements.push(match[1].trim());
      }
    }
    
    // Extract counts
    const faithfulMatch = response.match(/faithful statements[:\s]+(\d+)/i);
    const totalMatch = response.match(/total statements[:\s]+(\d+)/i);
    
    const faithfulCount = faithfulMatch ? parseInt(faithfulMatch[1]) : 0;
    const totalCount = totalMatch ? parseInt(totalMatch[1]) : statements.length;
    
    return {
      score: Math.max(0, Math.min(1, score)),
      reasoning,
      raw_response: response,
      metadata: {
        statements,
        faithful_statements: faithfulCount,
        total_statements: totalCount
      }
    };
  }
};

// ============================================================================
// Template Registry
// ============================================================================

export const METRIC_TEMPLATES = {
  correctness: CORRECTNESS_TEMPLATE,
  context_precision: CONTEXT_PRECISION_TEMPLATE,
  answer_relevance: ANSWER_RELEVANCE_TEMPLATE,
  faithfulness: FAITHFULNESS_TEMPLATE
} as const;

export type MetricName = keyof typeof METRIC_TEMPLATES;

/**
 * Fill template with variables
 */
export function fillTemplate(template: string, variables: Record<string, string>): string {
  let filled = template;
  
  for (const [key, value] of Object.entries(variables)) {
    const regex = new RegExp(`{{${key}}}`, 'g');
    filled = filled.replace(regex, value);
  }
  
  return filled;
}
