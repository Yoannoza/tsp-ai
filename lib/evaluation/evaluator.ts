/**
 * Main Evaluator
 * Orchestrates the evaluation process across all metrics
 */

import { promises as fs } from 'fs';
import path from 'path';
import Papa from 'papaparse';
import { nanoid } from 'nanoid';
import type {
  Dataset,
  EvaluationConfig,
  EvaluationResult,
  EvaluationSample,
  EvaluationSummary,
  MetricSummary,
  EvaluationProgress
} from './types';
import { createGeminiJudge } from './judges/gemini-judge';
import {
  evaluateCorrectness,
  evaluateContextPrecision,
  evaluateAnswerRelevance,
  evaluateFaithfulness
} from './metrics';

export class Evaluator {
  private config: EvaluationConfig;
  private judge: ReturnType<typeof createGeminiJudge>;
  private progress: EvaluationProgress;
  private results: EvaluationResult[] = [];
  private progressCallback?: (progress: EvaluationProgress) => void;

  constructor(config: EvaluationConfig) {
    this.config = config;
    this.judge = createGeminiJudge(config.gemini_config);
    this.progress = {
      current_sample: 0,
      total_samples: 0,
      current_metric: '',
      status: 'running',
      progress_percentage: 0
    };
  }

  /**
   * Set progress callback for real-time updates
   */
  onProgress(callback: (progress: EvaluationProgress) => void) {
    this.progressCallback = callback;
  }

  /**
   * Load dataset from CSV file
   */
  async loadDataset(csvPath: string): Promise<Dataset> {
    const fileContent = await fs.readFile(csvPath, 'utf-8');
    
    return new Promise((resolve, reject) => {
      Papa.parse<Record<string, string>>(fileContent, {
        header: true,
        skipEmptyLines: true,
        complete: (results) => {
          const samples: EvaluationSample[] = results.data.map((row, index) => {
            // Parse metadata if it's JSON
            let parsedMetadata: any = {};
            if (row.metadata) {
              try {
                parsedMetadata = JSON.parse(row.metadata);
              } catch (e) {
                console.warn(`Failed to parse metadata for row ${index}:`, e);
              }
            }

            return {
              // Support multiple column name formats
              id: row.id || `sample_${index + 1}`,
              
              // Query/Input: the question
              query: row.input || row.query || row.question || '',
              
              // Generation: the generated answer (from model)
              // Note: This should be the model's output, not the expected output
              // If you don't have a generation column, you need to generate answers first
              generation: row.generation || row.output || row.answer || '',
              
              // Ground truth: the expected answer
              ground_truth: row.expected_output || row.ground_truth || row.expected || '',
              
              // Context: optional additional information
              context: row.context || parsedMetadata.context,
              
              // Answer: alias for generation
              answer: row.answer || row.generation,
              
              // Metadata: parsed JSON object
              metadata: parsedMetadata
            };
          });

          const dataset: Dataset = {
            name: path.basename(csvPath, '.csv'),
            samples,
            metadata: {
              created_at: new Date().toISOString(),
              source: csvPath
            }
          };

          resolve(dataset);
        },
        error: (error: any) => {
          reject(new Error(`Failed to parse CSV: ${error.message}`));
        }
      });
    });
  }

  /**
   * Run evaluation on a dataset
   */
  async evaluate(dataset?: Dataset): Promise<EvaluationSummary> {
    const startTime = Date.now();
    
    // Load dataset if not provided
    const datasetToUse = dataset || await this.loadDataset(this.config.dataset_path);
    
    // Limit samples if configured
    const samples = this.config.max_samples
      ? datasetToUse.samples.slice(0, this.config.max_samples)
      : datasetToUse.samples;

    this.progress.total_samples = samples.length;
    this.progress.status = 'running';
    this.updateProgress();

    const evaluationId = nanoid();
    this.results = [];

    // Evaluate each sample
    for (let i = 0; i < samples.length; i++) {
      const sample = samples[i];
      this.progress.current_sample = i + 1;
      
      try {
        const result = await this.evaluateSample(sample);
        this.results.push(result);
      } catch (error) {
        console.error(`Failed to evaluate sample ${sample.id}:`, error);
        // Continue with next sample
      }
      
      this.progress.progress_percentage = ((i + 1) / samples.length) * 100;
      this.updateProgress();
    }

    this.progress.status = 'completed';
    this.updateProgress();

    const endTime = Date.now();
    const durationSeconds = (endTime - startTime) / 1000;

    // Calculate summary
    const summary: EvaluationSummary = {
      evaluation_id: evaluationId,
      dataset_name: datasetToUse.name,
      total_samples: samples.length,
      completed_samples: this.results.length,
      failed_samples: samples.length - this.results.length,
      started_at: new Date(startTime).toISOString(),
      completed_at: new Date(endTime).toISOString(),
      duration_seconds: durationSeconds,
      metrics: {
        correctness: this.calculateMetricSummary('correctness'),
        context_precision: this.calculateMetricSummary('context_precision'),
        answer_relevance: this.calculateMetricSummary('answer_relevance'),
        faithfulness: this.calculateMetricSummary('faithfulness')
      },
      results: this.results
    };

    // Save results if configured
    if (this.config.save_results && this.config.output_path) {
      await this.saveResults(summary);
    }

    return summary;
  }

  /**
   * Evaluate a single sample across all configured metrics
   */
  private async evaluateSample(sample: EvaluationSample): Promise<EvaluationResult> {
    const scores: EvaluationResult['scores'] = {} as any;

    // Evaluate each metric
    for (const metricName of this.config.metrics_to_run) {
      this.progress.current_metric = metricName;
      this.updateProgress();

      switch (metricName) {
        case 'correctness':
          scores.correctness = await evaluateCorrectness(sample, this.judge);
          break;
        case 'context_precision':
          scores.context_precision = await evaluateContextPrecision(sample, this.judge);
          break;
        case 'answer_relevance':
          scores.answer_relevance = await evaluateAnswerRelevance(sample, this.judge);
          break;
        case 'faithfulness':
          scores.faithfulness = await evaluateFaithfulness(sample, this.judge);
          break;
      }
    }

    return {
      sample_id: sample.id,
      query: sample.query,
      generation: sample.generation,
      ground_truth: sample.ground_truth,
      context: sample.context,
      answer: sample.answer,
      scores,
      timestamp: new Date().toISOString()
    };
  }

  /**
   * Calculate summary statistics for a metric
   */
  private calculateMetricSummary(metricName: keyof EvaluationResult['scores']): MetricSummary {
    const scores = this.results
      .map(r => r.scores[metricName]?.score)
      .filter((s): s is number => s !== undefined);

    if (scores.length === 0) {
      return {
        average: 0,
        min: 0,
        max: 0,
        median: 0,
        std_dev: 0,
        distribution: {
          '0.0-0.2': 0,
          '0.2-0.4': 0,
          '0.4-0.6': 0,
          '0.6-0.8': 0,
          '0.8-1.0': 0
        }
      };
    }

    const sorted = scores.slice().sort((a, b) => a - b);
    const sum = scores.reduce((a, b) => a + b, 0);
    const average = sum / scores.length;
    const median = sorted[Math.floor(sorted.length / 2)];
    
    // Calculate standard deviation
    const variance = scores.reduce((acc, score) => acc + Math.pow(score - average, 2), 0) / scores.length;
    const std_dev = Math.sqrt(variance);

    // Calculate distribution
    const distribution = {
      '0.0-0.2': scores.filter(s => s >= 0 && s < 0.2).length,
      '0.2-0.4': scores.filter(s => s >= 0.2 && s < 0.4).length,
      '0.4-0.6': scores.filter(s => s >= 0.4 && s < 0.6).length,
      '0.6-0.8': scores.filter(s => s >= 0.6 && s < 0.8).length,
      '0.8-1.0': scores.filter(s => s >= 0.8 && s <= 1.0).length
    };

    return {
      average,
      min: sorted[0],
      max: sorted[sorted.length - 1],
      median,
      std_dev,
      distribution
    };
  }

  /**
   * Save evaluation results to file
   */
  private async saveResults(summary: EvaluationSummary): Promise<void> {
    const outputPath = this.config.output_path!;
    const dir = path.dirname(outputPath);
    
    // Ensure directory exists
    await fs.mkdir(dir, { recursive: true });
    
    // Save as JSON
    await fs.writeFile(
      outputPath,
      JSON.stringify(summary, null, 2),
      'utf-8'
    );

    console.log(`✅ Results saved to: ${outputPath}`);
  }

  /**
   * Export results to CSV
   */
  async exportToCSV(summary: EvaluationSummary, outputPath: string): Promise<void> {
    const rows = summary.results.map(result => ({
      sample_id: result.sample_id,
      query: result.query,
      generation: result.generation,
      ground_truth: result.ground_truth,
      correctness_score: result.scores.correctness?.score || 0,
      correctness_reasoning: result.scores.correctness?.reasoning || '',
      context_precision_score: result.scores.context_precision?.score || 0,
      context_precision_reasoning: result.scores.context_precision?.reasoning || '',
      answer_relevance_score: result.scores.answer_relevance?.score || 0,
      answer_relevance_reasoning: result.scores.answer_relevance?.reasoning || '',
      faithfulness_score: result.scores.faithfulness?.score || 0,
      faithfulness_reasoning: result.scores.faithfulness?.reasoning || ''
    }));

    const csv = Papa.unparse(rows);
    await fs.writeFile(outputPath, csv, 'utf-8');
    
    console.log(`✅ CSV exported to: ${outputPath}`);
  }

  /**
   * Update progress and call callback if set
   */
  private updateProgress() {
    if (this.progressCallback) {
      this.progressCallback({ ...this.progress });
    }
  }

  /**
   * Get current progress
   */
  getProgress(): EvaluationProgress {
    return { ...this.progress };
  }

  /**
   * Get current results
   */
  getResults(): EvaluationResult[] {
    return this.results;
  }
}

/**
 * Quick evaluation helper
 */
export async function runEvaluation(config: EvaluationConfig): Promise<EvaluationSummary> {
  const evaluator = new Evaluator(config);
  return await evaluator.evaluate();
}
