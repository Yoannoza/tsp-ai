/**
 * Types for the evaluation system
 * Custom implementation without external frameworks
 */

// ============================================================================
// Dataset Types
// ============================================================================

export interface EvaluationSample {
  id: string;
  query: string; // input from CSV
  generation: string; // generated answer (to be filled by model or provided)
  ground_truth: string; // expected_output from CSV
  context?: string; // optional context
  answer?: string; // alias for generation
  metadata?: {
    question_number?: number;
    category?: string;
    source?: string;
    [key: string]: any;
  };
}

export interface Dataset {
  name: string;
  samples: EvaluationSample[];
  metadata?: {
    created_at: string;
    description?: string;
    source?: string;
  };
}

// ============================================================================
// Metric Types
// ============================================================================

export interface MetricScore {
  score: number; // 0-1 continuous scale
  reasoning: string;
  metadata?: Record<string, any>;
}

export interface CorrectnessMetric extends MetricScore {
  key_facts_included: boolean;
  factual_support: boolean;
}

export interface ContextPrecisionMetric extends MetricScore {
  context_useful: boolean;
  context_relevant: boolean;
}

export interface AnswerRelevanceMetric extends MetricScore {
  noncommittal: 0 | 1;
  generated_question?: string;
}

export interface FaithfulnessMetric extends MetricScore {
  statements: string[];
  faithful_statements: number;
  total_statements: number;
}

// ============================================================================
// Evaluation Result Types
// ============================================================================

export interface EvaluationResult {
  sample_id: string;
  query: string;
  generation: string;
  ground_truth: string;
  context?: string;
  answer?: string;
  scores: {
    correctness: CorrectnessMetric;
    context_precision: ContextPrecisionMetric;
    answer_relevance: AnswerRelevanceMetric;
    faithfulness: FaithfulnessMetric;
  };
  timestamp: string;
}

export interface EvaluationSummary {
  evaluation_id: string;
  dataset_name: string;
  total_samples: number;
  completed_samples: number;
  failed_samples: number;
  started_at: string;
  completed_at?: string;
  duration_seconds?: number;
  metrics: {
    correctness: MetricSummary;
    context_precision: MetricSummary;
    answer_relevance: MetricSummary;
    faithfulness: MetricSummary;
  };
  results: EvaluationResult[];
}

export interface MetricSummary {
  average: number;
  min: number;
  max: number;
  median: number;
  std_dev: number;
  distribution: {
    '0.0-0.2': number;
    '0.2-0.4': number;
    '0.4-0.6': number;
    '0.6-0.8': number;
    '0.8-1.0': number;
  };
}

// ============================================================================
// Gemini Judge Types
// ============================================================================

export interface GeminiJudgeConfig {
  model: string; // e.g., 'gemini-2.5-flash-lite'
  apiKey: string;
  temperature?: number;
  maxTokens?: number;
  retryAttempts?: number;
  retryDelay?: number;
}

export interface JudgeResponse {
  score: number;
  reasoning: string;
  raw_response: string;
  metadata?: Record<string, any>;
}

// ============================================================================
// Prompt Template Types
// ============================================================================

export interface PromptTemplate {
  name: string;
  description: string;
  template: string;
  variables: string[];
  parser: (response: string) => JudgeResponse;
}

export type PromptVariables = Record<string, string | number>;

// ============================================================================
// Evaluation Configuration
// ============================================================================

export interface EvaluationConfig {
  dataset_path: string;
  model_name: string;
  gemini_config: GeminiJudgeConfig;
  metrics_to_run: ('correctness' | 'context_precision' | 'answer_relevance' | 'faithfulness')[];
  max_samples?: number;
  batch_size?: number;
  save_results?: boolean;
  output_path?: string;
}

// ============================================================================
// Progress Tracking
// ============================================================================

export interface EvaluationProgress {
  current_sample: number;
  total_samples: number;
  current_metric: string;
  status: 'running' | 'completed' | 'failed' | 'paused';
  progress_percentage: number;
  estimated_time_remaining?: number;
}

// ============================================================================
// Export Types
// ============================================================================

export type ExportFormat = 'json' | 'csv';

export interface ExportOptions {
  format: ExportFormat;
  include_reasoning?: boolean;
  include_metadata?: boolean;
}
