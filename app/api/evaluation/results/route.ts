/**
 * API Route: Get Evaluation Results
 * GET /api/evaluation/results
 */

import { NextRequest, NextResponse } from 'next/server';
import { promises as fs } from 'fs';
import path from 'path';

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const evaluationId = searchParams.get('id');

    const resultsDir = path.join(process.cwd(), 'datasets', 'evaluation_results');

    // List all result files
    const files = await fs.readdir(resultsDir).catch(() => []);
    const jsonFiles = files.filter(f => f.endsWith('.json'));

    if (evaluationId) {
      // Get specific evaluation
      const file = jsonFiles.find(f => f.includes(evaluationId));
      
      if (!file) {
        return NextResponse.json(
          { success: false, error: 'Evaluation not found' },
          { status: 404 }
        );
      }

      const filePath = path.join(resultsDir, file);
      const content = await fs.readFile(filePath, 'utf-8');
      const data = JSON.parse(content);

      return NextResponse.json({
        success: true,
        data
      });
    }

    // List all evaluations
    const evaluations = await Promise.all(
      jsonFiles.map(async (file) => {
        const filePath = path.join(resultsDir, file);
        const content = await fs.readFile(filePath, 'utf-8');
        const data = JSON.parse(content);

        return {
          evaluation_id: data.evaluation_id,
          dataset_name: data.dataset_name,
          total_samples: data.total_samples,
          completed_samples: data.completed_samples,
          started_at: data.started_at,
          completed_at: data.completed_at,
          duration_seconds: data.duration_seconds,
          metrics_summary: {
            correctness: data.metrics.correctness.average,
            context_precision: data.metrics.context_precision.average,
            answer_relevance: data.metrics.answer_relevance.average,
            faithfulness: data.metrics.faithfulness.average
          }
        };
      })
    );

    // Sort by date (newest first)
    evaluations.sort((a, b) => 
      new Date(b.started_at).getTime() - new Date(a.started_at).getTime()
    );

    return NextResponse.json({
      success: true,
      data: {
        total: evaluations.length,
        evaluations
      }
    });

  } catch (error: any) {
    console.error('Error fetching results:', error);
    
    return NextResponse.json(
      {
        success: false,
        error: error.message || 'Failed to fetch results'
      },
      { status: 500 }
    );
  }
}
