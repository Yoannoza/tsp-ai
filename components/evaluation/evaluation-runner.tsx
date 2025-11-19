/**
 * Evaluation Runner Component
 * Interface for starting new evaluations
 */

'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Checkbox } from '@/components/ui/checkbox';
import { Progress } from '@/components/ui/progress';
import { PlayIcon, StopCircleIcon } from 'lucide-react';
import type { EvaluationSummary } from '@/lib/evaluation';

interface EvaluationRunnerProps {
  onComplete?: (summary: EvaluationSummary) => void;
}

export function EvaluationRunner({ onComplete }: EvaluationRunnerProps) {
  const [isRunning, setIsRunning] = useState(false);
  const [progress, setProgress] = useState(0);
  const [config, setConfig] = useState({
    dataset_name: 'esn_qa_dataset',
    model_name: 'gemini-2.5-flash-lite',
    max_samples: '',
    metrics: {
      correctness: true,
      context_precision: true,
      answer_relevance: true,
      faithfulness: true
    },
    save_results: true
  });

  const handleRun = async () => {
    setIsRunning(true);
    setProgress(0);

    try {
      const selectedMetrics = Object.entries(config.metrics)
        .filter(([_, enabled]) => enabled)
        .map(([name, _]) => name);

      const response = await fetch('/api/evaluation/run', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          dataset_name: config.dataset_name,
          model_name: config.model_name,
          max_samples: config.max_samples ? parseInt(config.max_samples) : undefined,
          metrics: selectedMetrics,
          save_results: config.save_results
        })
      });

      if (!response.ok) {
        throw new Error('Evaluation failed');
      }

      const result = await response.json();
      
      if (result.success) {
        setProgress(100);
        onComplete?.(result.data);
      } else {
        throw new Error(result.error);
      }
    } catch (error) {
      console.error('Evaluation error:', error);
      alert('Evaluation failed. Check console for details.');
    } finally {
      setIsRunning(false);
    }
  };

  const selectedMetricsCount = Object.values(config.metrics).filter(Boolean).length;

  return (
    <Card>
      <CardHeader>
        <CardTitle>Run New Evaluation</CardTitle>
        <CardDescription>
          Configure and start a new evaluation run with Gemini as Judge
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Dataset Selection */}
        <div className="space-y-2">
          <Label htmlFor="dataset">Dataset</Label>
          <Select
            value={config.dataset_name}
            onValueChange={(value) => setConfig({ ...config, dataset_name: value })}
            disabled={isRunning}
          >
            <SelectTrigger id="dataset">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="esn_qa_dataset">ESN Q&A Dataset</SelectItem>
              {/* Add more datasets as needed */}
            </SelectContent>
          </Select>
        </div>

        {/* Model Selection */}
        <div className="space-y-2">
          <Label htmlFor="model">Gemini Model</Label>
          <Select
            value={config.model_name}
            onValueChange={(value) => setConfig({ ...config, model_name: value })}
            disabled={isRunning}
          >
            <SelectTrigger id="model">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="gemini-2.5-flash-lite">Gemini 2.5 Flash (Experimental)</SelectItem>
              <SelectItem value="gemini-1.5-pro">Gemini 1.5 Pro</SelectItem>
              <SelectItem value="gemini-1.5-flash">Gemini 1.5 Flash</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Max Samples */}
        <div className="space-y-2">
          <Label htmlFor="max_samples">Max Samples (optional)</Label>
          <Input
            id="max_samples"
            type="number"
            placeholder="Leave empty to evaluate all"
            value={config.max_samples}
            onChange={(e) => setConfig({ ...config, max_samples: e.target.value })}
            disabled={isRunning}
          />
        </div>

        {/* Metrics Selection */}
        <div className="space-y-2">
          <Label>Metrics to Evaluate</Label>
          <div className="space-y-2">
            {Object.entries(config.metrics).map(([metric, enabled]) => (
              <div key={metric} className="flex items-center space-x-2">
                <Checkbox
                  id={metric}
                  checked={enabled}
                  onCheckedChange={(checked: boolean) =>
                    setConfig({
                      ...config,
                      metrics: { ...config.metrics, [metric]: checked }
                    })
                  }
                  disabled={isRunning}
                />
                <Label
                  htmlFor={metric}
                  className="text-sm font-normal capitalize cursor-pointer"
                >
                  {metric.replace('_', ' ')}
                </Label>
              </div>
            ))}
          </div>
          <p className="text-xs text-muted-foreground">
            {selectedMetricsCount} metric{selectedMetricsCount !== 1 ? 's' : ''} selected
          </p>
        </div>

        {/* Save Results */}
        <div className="flex items-center space-x-2">
          <Checkbox
            id="save_results"
            checked={config.save_results}
            onCheckedChange={(checked: boolean) =>
              setConfig({ ...config, save_results: checked })
            }
            disabled={isRunning}
          />
          <Label htmlFor="save_results" className="text-sm font-normal cursor-pointer">
            Save results to file
          </Label>
        </div>

        {/* Progress */}
        {isRunning && (
          <div className="space-y-2">
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Running evaluation...</span>
              <span className="font-medium">{progress}%</span>
            </div>
            <Progress value={progress} />
          </div>
        )}

        {/* Run Button */}
        <Button
          onClick={handleRun}
          disabled={isRunning || selectedMetricsCount === 0}
          className="w-full"
          size="lg"
        >
          {isRunning ? (
            <>
              <StopCircleIcon className="mr-2 h-4 w-4 animate-spin" />
              Running...
            </>
          ) : (
            <>
              <PlayIcon className="mr-2 h-4 w-4" />
              Start Evaluation
            </>
          )}
        </Button>

        {selectedMetricsCount === 0 && (
          <p className="text-xs text-destructive text-center">
            Please select at least one metric to evaluate
          </p>
        )}
      </CardContent>
    </Card>
  );
}
