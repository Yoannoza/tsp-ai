/**
 * Results Table Component
 * Displays detailed evaluation results in a table
 */

'use client';

import { useState } from 'react';
import type { EvaluationResult } from '@/lib/evaluation';
import { Button } from '@/components/ui/button';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader, 
  DialogTitle,
} from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';

interface ResultsTableProps {
  results: EvaluationResult[];
}

export function ResultsTable({ results }: ResultsTableProps) {
  const [selectedResult, setSelectedResult] = useState<EvaluationResult | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;

  const totalPages = Math.ceil(results.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const paginatedResults = results.slice(startIndex, startIndex + itemsPerPage);

  const getScoreBadge = (score: number) => {
    if (score >= 0.8) return <Badge className="bg-green-500">Excellent</Badge>;
    if (score >= 0.6) return <Badge className="bg-blue-500">Good</Badge>;
    if (score >= 0.4) return <Badge className="bg-yellow-500">Fair</Badge>;
    return <Badge className="bg-red-500">Poor</Badge>;
  };

  return (
    <>
      <div className="bg-background border rounded-lg overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-[100px]">Sample ID</TableHead>
              <TableHead>Query</TableHead>
              <TableHead className="text-center">Correctness</TableHead>
              <TableHead className="text-center">Context Prec.</TableHead>
              <TableHead className="text-center">Relevance</TableHead>
              <TableHead className="text-center">Faithfulness</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {paginatedResults.map((result) => {
              const avgScore = (
                (result.scores.correctness?.score || 0) +
                (result.scores.context_precision?.score || 0) +
                (result.scores.answer_relevance?.score || 0) +
                (result.scores.faithfulness?.score || 0)
              ) / 4;

              return (
                <TableRow key={result.sample_id}>
                  <TableCell className="font-mono text-xs">
                    {result.sample_id.substring(0, 8)}...
                  </TableCell>
                  <TableCell className="max-w-md truncate">
                    {result.query}
                  </TableCell>
                  <TableCell className="text-center">
                    <span className={getScoreColor(result.scores.correctness?.score || 0)}>
                      {(result.scores.correctness?.score || 0).toFixed(2)}
                    </span>
                  </TableCell>
                  <TableCell className="text-center">
                    <span className={getScoreColor(result.scores.context_precision?.score || 0)}>
                      {(result.scores.context_precision?.score || 0).toFixed(2)}
                    </span>
                  </TableCell>
                  <TableCell className="text-center">
                    <span className={getScoreColor(result.scores.answer_relevance?.score || 0)}>
                      {(result.scores.answer_relevance?.score || 0).toFixed(2)}
                    </span>
                  </TableCell>
                  <TableCell className="text-center">
                    <span className={getScoreColor(result.scores.faithfulness?.score || 0)}>
                      {(result.scores.faithfulness?.score || 0).toFixed(2)}
                    </span>
                  </TableCell>
                  <TableCell className="text-right">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setSelectedResult(result)}
                    >
                      Details
                    </Button>
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between px-4 py-3 border-t">
            <div className="text-sm text-muted-foreground">
              Showing {startIndex + 1} to {Math.min(startIndex + itemsPerPage, results.length)} of{' '}
              {results.length} results
            </div>
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                disabled={currentPage === 1}
              >
                Previous
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                disabled={currentPage === totalPages}
              >
                Next
              </Button>
            </div>
          </div>
        )}
      </div>

      {/* Detail Dialog */}
      <Dialog open={!!selectedResult} onOpenChange={() => setSelectedResult(null)}>
        <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Evaluation Details</DialogTitle>
            <DialogDescription>Sample ID: {selectedResult?.sample_id}</DialogDescription>
          </DialogHeader>

          {selectedResult && (
            <div className="space-y-6">
              {/* Query & Generation */}
              <div>
                <h4 className="font-semibold mb-2">Query</h4>
                <p className="text-sm bg-muted p-3 rounded">{selectedResult.query}</p>
              </div>

              <div>
                <h4 className="font-semibold mb-2">Generation</h4>
                <p className="text-sm bg-muted p-3 rounded">{selectedResult.generation}</p>
              </div>

              <div>
                <h4 className="font-semibold mb-2">Ground Truth</h4>
                <p className="text-sm bg-muted p-3 rounded">{selectedResult.ground_truth}</p>
              </div>

              {selectedResult.context && (
                <div>
                  <h4 className="font-semibold mb-2">Context</h4>
                  <p className="text-sm bg-muted p-3 rounded">{selectedResult.context}</p>
                </div>
              )}

              {/* Scores */}
              <div className="grid grid-cols-2 gap-4">
                {Object.entries(selectedResult.scores).map(([metric, data]) => (
                  <div key={metric} className="border rounded-lg p-4">
                    <div className="flex justify-between items-center mb-2">
                      <h4 className="font-semibold capitalize">
                        {metric.replace('_', ' ')}
                      </h4>
                      {getScoreBadge(data.score)}
                    </div>
                    <div className="text-2xl font-bold mb-2">
                      {(data.score * 100).toFixed(1)}%
                    </div>
                    <p className="text-xs text-muted-foreground">
                      {data.reasoning}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}

function getScoreColor(score: number): string {
  if (score >= 0.8) return 'text-green-600 dark:text-green-400 font-semibold';
  if (score >= 0.6) return 'text-blue-600 dark:text-blue-400 font-medium';
  if (score >= 0.4) return 'text-yellow-600 dark:text-yellow-400';
  return 'text-red-600 dark:text-red-400';
}
