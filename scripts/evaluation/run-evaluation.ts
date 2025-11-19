#!/usr/bin/env tsx
/**
 * CLI Script to run evaluations
 * Usage: pnpm eval --dataset esn_qa_dataset --max-samples 10
 */

import { Evaluator } from '../../lib/evaluation';
import type { EvaluationConfig, EvaluationProgress } from '../../lib/evaluation';
import path from 'path';

async function main() {
  const args = process.argv.slice(2);
  
  // Parse arguments
  const getArg = (flag: string, defaultValue?: string): string | undefined => {
    const index = args.indexOf(flag);
    return index !== -1 && args[index + 1] ? args[index + 1] : defaultValue;
  };

  const datasetName = getArg('--dataset', 'esn_qa_dataset')!;
  const modelName = getArg('--model', 'gemini-2.5-flash-lite')!;
  const maxSamplesStr = getArg('--max-samples');
  const outputPath = getArg('--output');

  console.log('🚀 Starting Evaluation');
  console.log('━'.repeat(60));
  console.log(`Dataset: ${datasetName}`);
  console.log(`Model: ${modelName}`);
  if (maxSamplesStr) console.log(`Max Samples: ${maxSamplesStr}`);
  console.log('━'.repeat(60));

  const config: EvaluationConfig = {
    dataset_path: path.join(process.cwd(), 'datasets', `${datasetName}.csv`),
    model_name: modelName,
    gemini_config: {
      model: modelName,
      apiKey: process.env.GOOGLE_GENERATIVE_AI_API_KEY!,
      temperature: 0.1
    },
    metrics_to_run: ['correctness', 'context_precision', 'answer_relevance', 'faithfulness'],
    max_samples: maxSamplesStr ? parseInt(maxSamplesStr) : undefined,
    save_results: true,
    output_path: outputPath || path.join(
      process.cwd(),
      'datasets',
      'evaluation_results',
      `${Date.now()}_results.json`
    )
  };

  const evaluator = new Evaluator(config);

  // Progress tracking
  evaluator.onProgress((progress: EvaluationProgress) => {
    const percent = progress.progress_percentage.toFixed(1);
    const bar = generateProgressBar(progress.progress_percentage);
    process.stdout.write(
      `\r${bar} ${percent}% | Sample ${progress.current_sample}/${progress.total_samples} | ${progress.current_metric}`
    );
  });

  try {
    const summary = await evaluator.evaluate();

    console.log('\n\n✅ Evaluation Complete!');
    console.log('━'.repeat(60));
    console.log(`Evaluation ID: ${summary.evaluation_id}`);
    console.log(`Total Samples: ${summary.total_samples}`);
    console.log(`Completed: ${summary.completed_samples}`);
    console.log(`Failed: ${summary.failed_samples}`);
    console.log(`Duration: ${summary.duration_seconds?.toFixed(2)}s`);
    console.log('\n📊 Metric Averages:');
    console.log(`  Correctness:       ${(summary.metrics.correctness.average * 100).toFixed(2)}%`);
    console.log(`  Context Precision: ${(summary.metrics.context_precision.average * 100).toFixed(2)}%`);
    console.log(`  Answer Relevance:  ${(summary.metrics.answer_relevance.average * 100).toFixed(2)}%`);
    console.log(`  Faithfulness:      ${(summary.metrics.faithfulness.average * 100).toFixed(2)}%`);
    console.log('━'.repeat(60));
    
    if (config.save_results) {
      console.log(`\n💾 Results saved to: ${config.output_path}`);
    }

    // Export CSV
    const csvPath = config.output_path!.replace('.json', '.csv');
    await evaluator.exportToCSV(summary, csvPath);
    console.log(`📁 CSV exported to: ${csvPath}`);

  } catch (error) {
    console.error('\n\n❌ Evaluation failed:', error);
    process.exit(1);
  }
}

function generateProgressBar(percentage: number, length: number = 40): string {
  const filled = Math.round((percentage / 100) * length);
  const empty = length - filled;
  return `[${'█'.repeat(filled)}${' '.repeat(empty)}]`;
}

main();
