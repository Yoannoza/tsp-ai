/**
 * API Route: Run Evaluation
 * POST /api/evaluation/run
 */

import { NextRequest, NextResponse } from 'next/server';
import path from 'path';
import { Evaluator } from '@/lib/evaluation';
import type { EvaluationConfig } from '@/lib/evaluation';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    
    const {
      dataset_name = 'esn_qa_dataset',
      model_name = 'gemini-2.5-flash-lite',
      metrics = ['correctness', 'context_precision', 'answer_relevance', 'faithfulness'],
      max_samples,
      save_results = true
    } = body;

    // Build config
    const config: EvaluationConfig = {
      dataset_path: path.join(process.cwd(), 'datasets', `${dataset_name}.csv`),
      model_name,
      gemini_config: {
        model: model_name,
        apiKey: process.env.XAI_API_KEY!,
        temperature: 0.1
      },
      metrics_to_run: metrics,
      max_samples,
      save_results,
      output_path: save_results 
        ? path.join(process.cwd(), 'datasets', 'evaluation_results', `${Date.now()}_results.json`)
        : undefined
    };

    // Create evaluator
    const evaluator = new Evaluator(config);

    // Stream progress updates (optional)
    // For now, we'll just run the evaluation and return results
    
    const summary = await evaluator.evaluate();

    return NextResponse.json({
      success: true,
      data: summary
    });
    
  } catch (error: any) {
    console.error('Evaluation error:', error);
    
    return NextResponse.json(
      {
        success: false,
        error: error.message || 'Failed to run evaluation'
      },
      { status: 500 }
    );
  }
}

export async function GET() {
  return NextResponse.json({
    message: 'Use POST to run an evaluation',
    example: {
      dataset_name: 'esn_qa_dataset',
      model_name: 'gemini-2.5-flash-lite',
      metrics: ['correctness', 'context_precision', 'answer_relevance', 'faithfulness'],
      max_samples: 10,
      save_results: true
    }
  });
}
