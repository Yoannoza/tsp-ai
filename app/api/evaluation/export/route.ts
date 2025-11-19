/**
 * API Route: Export Evaluation Results
 * GET /api/evaluation/export?id=xxx&format=csv|json
 */

import { NextRequest, NextResponse } from 'next/server';
import { promises as fs } from 'fs';
import path from 'path';
import Papa from 'papaparse';
import type { EvaluationSummary } from '@/lib/evaluation';

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const evaluationId = searchParams.get('id');
    const format = searchParams.get('format') || 'json';

    if (!evaluationId) {
      return NextResponse.json(
        { success: false, error: 'Evaluation ID is required' },
        { status: 400 }
      );
    }

    const resultsDir = path.join(process.cwd(), 'datasets', 'evaluation_results');
    const files = await fs.readdir(resultsDir);
    const file = files.find(f => f.includes(evaluationId) && f.endsWith('.json'));

    if (!file) {
      return NextResponse.json(
        { success: false, error: 'Evaluation not found' },
        { status: 404 }
      );
    }

    const filePath = path.join(resultsDir, file);
    const content = await fs.readFile(filePath, 'utf-8');
    const summary: EvaluationSummary = JSON.parse(content);

    if (format === 'csv') {
      // Export as CSV
      const rows = summary.results.map(result => ({
        sample_id: result.sample_id,
        query: result.query,
        generation: result.generation,
        ground_truth: result.ground_truth,
        context: result.context || '',
        correctness_score: result.scores.correctness?.score?.toFixed(3) || '0',
        correctness_reasoning: result.scores.correctness?.reasoning || '',
        context_precision_score: result.scores.context_precision?.score?.toFixed(3) || '0',
        context_precision_reasoning: result.scores.context_precision?.reasoning || '',
        answer_relevance_score: result.scores.answer_relevance?.score?.toFixed(3) || '0',
        answer_relevance_reasoning: result.scores.answer_relevance?.reasoning || '',
        faithfulness_score: result.scores.faithfulness?.score?.toFixed(3) || '0',
        faithfulness_reasoning: result.scores.faithfulness?.reasoning || '',
        timestamp: result.timestamp
      }));

      const csv = Papa.unparse(rows);

      return new NextResponse(csv, {
        headers: {
          'Content-Type': 'text/csv',
          'Content-Disposition': `attachment; filename="evaluation_${evaluationId}.csv"`
        }
      });
    }

    // Export as JSON
    return new NextResponse(JSON.stringify(summary, null, 2), {
      headers: {
        'Content-Type': 'application/json',
        'Content-Disposition': `attachment; filename="evaluation_${evaluationId}.json"`
      }
    });

  } catch (error: any) {
    console.error('Export error:', error);
    
    return NextResponse.json(
      {
        success: false,
        error: error.message || 'Failed to export results'
      },
      { status: 500 }
    );
  }
}
