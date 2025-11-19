/**
 * Metrics Chart Component
 * Displays distribution and scores for evaluation metrics
 */

'use client';

import { useMemo } from 'react';
import type { MetricSummary } from '@/lib/evaluation';

interface MetricsChartProps {
  metrics: {
    correctness: MetricSummary;
    context_precision: MetricSummary;
    answer_relevance: MetricSummary;
    faithfulness: MetricSummary;
  };
}

export function MetricsChart({ metrics }: MetricsChartProps) {
  const metricData = useMemo(() => [
    { name: 'Correctness', ...metrics.correctness, color: 'bg-blue-500' },
    { name: 'Context Precision', ...metrics.context_precision, color: 'bg-green-500' },
    { name: 'Answer Relevance', ...metrics.answer_relevance, color: 'bg-purple-500' },
    { name: 'Faithfulness', ...metrics.faithfulness, color: 'bg-orange-500' }
  ], [metrics]);

  return (
    <div className="space-y-6">
      {/* Average Scores Bar Chart */}
      <div className="bg-background border rounded-lg p-6">
        <h3 className="text-lg font-semibold mb-4">Average Scores</h3>
        <div className="space-y-4">
          {metricData.map((metric) => (
            <div key={metric.name}>
              <div className="flex justify-between items-center mb-1">
                <span className="text-sm font-medium">{metric.name}</span>
                <span className="text-sm text-muted-foreground">
                  {(metric.average * 100).toFixed(1)}%
                </span>
              </div>
              <div className="w-full bg-muted rounded-full h-3 overflow-hidden">
                <div
                  className={`h-full ${metric.color} transition-all duration-500`}
                  style={{ width: `${metric.average * 100}%` }}
                />
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Distribution Charts */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {metricData.map((metric) => (
          <div key={metric.name} className="bg-background border rounded-lg p-6">
            <h4 className="text-base font-semibold mb-4">{metric.name} Distribution</h4>
            <div className="space-y-2">
              {Object.entries(metric.distribution).map(([range, count]) => (
                <div key={range} className="flex items-center gap-2">
                  <span className="text-xs text-muted-foreground w-16">{range}</span>
                  <div className="flex-1 bg-muted rounded-full h-2 overflow-hidden">
                    <div
                      className={`h-full ${metric.color}`}
                      style={{
                        width: `${count > 0 ? (count / getTotalSamples(metric.distribution)) * 100 : 0}%`
                      }}
                    />
                  </div>
                  <span className="text-xs font-medium w-8 text-right">{count}</span>
                </div>
              ))}
            </div>
            <div className="mt-4 pt-4 border-t text-xs text-muted-foreground space-y-1">
              <div className="flex justify-between">
                <span>Min:</span>
                <span className="font-medium">{metric.min.toFixed(3)}</span>
              </div>
              <div className="flex justify-between">
                <span>Median:</span>
                <span className="font-medium">{metric.median.toFixed(3)}</span>
              </div>
              <div className="flex justify-between">
                <span>Max:</span>
                <span className="font-medium">{metric.max.toFixed(3)}</span>
              </div>
              <div className="flex justify-between">
                <span>Std Dev:</span>
                <span className="font-medium">{metric.std_dev.toFixed(3)}</span>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function getTotalSamples(distribution: Record<string, number>): number {
  return Object.values(distribution).reduce((sum, count) => sum + count, 0);
}
