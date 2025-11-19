/**
 * Dashboard Component
 * Main evaluation dashboard with summary and controls
 */

'use client';

import { useState, useEffect } from 'react';
import type { EvaluationSummary } from '@/lib/evaluation';
import { MetricsChart } from './metrics-chart';
import { ResultsTable } from './results-table';
import { EvaluationRunner } from './evaluation-runner';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { DownloadIcon, RefreshCwIcon } from 'lucide-react';

export function Dashboard() {
  const [evaluations, setEvaluations] = useState<any[]>([]);
  const [selectedEvaluation, setSelectedEvaluation] = useState<EvaluationSummary | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const loadEvaluations = async () => {
    setIsLoading(true);
    try {
      const response = await fetch('/api/evaluation/results');
      const result = await response.json();
      
      if (result.success) {
        setEvaluations(result.data.evaluations);
        
        // Auto-select most recent if available
        if (result.data.evaluations.length > 0 && !selectedEvaluation) {
          loadEvaluationDetails(result.data.evaluations[0].evaluation_id);
        }
      }
    } catch (error) {
      console.error('Failed to load evaluations:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const loadEvaluationDetails = async (id: string) => {
    try {
      const response = await fetch(`/api/evaluation/results?id=${id}`);
      const result = await response.json();
      
      if (result.success) {
        setSelectedEvaluation(result.data);
      }
    } catch (error) {
      console.error('Failed to load evaluation details:', error);
    }
  };

  const handleExport = async (format: 'json' | 'csv') => {
    if (!selectedEvaluation) return;

    const url = `/api/evaluation/export?id=${selectedEvaluation.evaluation_id}&format=${format}`;
    window.open(url, '_blank');
  };

  const handleEvaluationComplete = (summary: EvaluationSummary) => {
    setSelectedEvaluation(summary);
    loadEvaluations(); // Refresh list
  };

  useEffect(() => {
    loadEvaluations();
  }, []);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Evaluation Dashboard</h1>
          <p className="text-muted-foreground mt-1">
            LLM as Judge evaluation with Gemini
          </p>
        </div>
        <Button variant="outline" onClick={loadEvaluations} disabled={isLoading}>
          <RefreshCwIcon className={`mr-2 h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} />
          Refresh
        </Button>
      </div>

      {/* Summary Cards */}
      {selectedEvaluation && (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Samples</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{selectedEvaluation.total_samples}</div>
              <p className="text-xs text-muted-foreground">
                {selectedEvaluation.completed_samples} completed, {selectedEvaluation.failed_samples} failed
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Avg Correctness</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {(selectedEvaluation.metrics.correctness.average * 100).toFixed(1)}%
              </div>
              <p className="text-xs text-muted-foreground">
                Range: {(selectedEvaluation.metrics.correctness.min * 100).toFixed(0)}% - {(selectedEvaluation.metrics.correctness.max * 100).toFixed(0)}%
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Avg Faithfulness</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {(selectedEvaluation.metrics.faithfulness.average * 100).toFixed(1)}%
              </div>
              <p className="text-xs text-muted-foreground">
                Range: {(selectedEvaluation.metrics.faithfulness.min * 100).toFixed(0)}% - {(selectedEvaluation.metrics.faithfulness.max * 100).toFixed(0)}%
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Duration</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {selectedEvaluation.duration_seconds?.toFixed(0)}s
              </div>
              <p className="text-xs text-muted-foreground">
                {(selectedEvaluation.duration_seconds! / selectedEvaluation.total_samples).toFixed(1)}s per sample
              </p>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Main Content */}
      <Tabs defaultValue="runner" className="space-y-4">
        <TabsList>
          <TabsTrigger value="runner">New Evaluation</TabsTrigger>
          <TabsTrigger value="charts">Charts</TabsTrigger>
          <TabsTrigger value="results">Results</TabsTrigger>
          <TabsTrigger value="history">History</TabsTrigger>
        </TabsList>

        <TabsContent value="runner" className="space-y-4">
          <EvaluationRunner onComplete={handleEvaluationComplete} />
        </TabsContent>

        <TabsContent value="charts" className="space-y-4">
          {selectedEvaluation ? (
            <>
              <div className="flex justify-end gap-2">
                <Button variant="outline" size="sm" onClick={() => handleExport('json')}>
                  <DownloadIcon className="mr-2 h-4 w-4" />
                  Export JSON
                </Button>
                <Button variant="outline" size="sm" onClick={() => handleExport('csv')}>
                  <DownloadIcon className="mr-2 h-4 w-4" />
                  Export CSV
                </Button>
              </div>
              <MetricsChart metrics={selectedEvaluation.metrics} />
            </>
          ) : (
            <Card>
              <CardHeader>
                <CardTitle>No Evaluation Selected</CardTitle>
                <CardDescription>
                  Run a new evaluation or select one from history
                </CardDescription>
              </CardHeader>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="results" className="space-y-4">
          {selectedEvaluation ? (
            <ResultsTable results={selectedEvaluation.results} />
          ) : (
            <Card>
              <CardHeader>
                <CardTitle>No Results Available</CardTitle>
                <CardDescription>
                  Run a new evaluation to see results
                </CardDescription>
              </CardHeader>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="history" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Evaluation History</CardTitle>
              <CardDescription>
                Previous evaluation runs ({evaluations.length} total)
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {evaluations.map((evaluation) => (
                  <div
                    key={evaluation.evaluation_id}
                    className={`p-4 border rounded-lg cursor-pointer transition-colors hover:bg-muted ${
                      selectedEvaluation?.evaluation_id === evaluation.evaluation_id
                        ? 'border-primary bg-muted'
                        : ''
                    }`}
                    onClick={() => loadEvaluationDetails(evaluation.evaluation_id)}
                  >
                    <div className="flex justify-between items-start mb-2">
                      <div>
                        <h4 className="font-semibold">{evaluation.dataset_name}</h4>
                        <p className="text-xs text-muted-foreground">
                          {new Date(evaluation.started_at).toLocaleString()}
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="text-sm font-medium">{evaluation.total_samples} samples</p>
                        <p className="text-xs text-muted-foreground">
                          {evaluation.duration_seconds?.toFixed(0)}s
                        </p>
                      </div>
                    </div>
                    <div className="grid grid-cols-4 gap-2 text-xs">
                      <div>
                        <span className="text-muted-foreground">Correctness:</span>
                        <span className="ml-1 font-medium">
                          {(evaluation.metrics_summary.correctness * 100).toFixed(0)}%
                        </span>
                      </div>
                      <div>
                        <span className="text-muted-foreground">Context:</span>
                        <span className="ml-1 font-medium">
                          {(evaluation.metrics_summary.context_precision * 100).toFixed(0)}%
                        </span>
                      </div>
                      <div>
                        <span className="text-muted-foreground">Relevance:</span>
                        <span className="ml-1 font-medium">
                          {(evaluation.metrics_summary.answer_relevance * 100).toFixed(0)}%
                        </span>
                      </div>
                      <div>
                        <span className="text-muted-foreground">Faithfulness:</span>
                        <span className="ml-1 font-medium">
                          {(evaluation.metrics_summary.faithfulness * 100).toFixed(0)}%
                        </span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
