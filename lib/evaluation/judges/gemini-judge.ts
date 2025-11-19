/**
 * Gemini Judge - LLM as Judge implementation
 * Uses Google Generative AI SDK to evaluate responses
 */

import { google } from '@ai-sdk/google';
import { generateText } from 'ai';
import type { GeminiJudgeConfig, JudgeResponse, PromptTemplate } from '../types';
import { fillTemplate } from '../prompts/templates';

export class GeminiJudge {
  private config: Required<GeminiJudgeConfig>;
  
  constructor(config: GeminiJudgeConfig) {
    this.config = {
      model: config.model || 'gemini-2.5-flash-lite',
      apiKey: config.apiKey,
      temperature: config.temperature ?? 0.1, // Low temperature for consistent scoring
      maxTokens: config.maxTokens ?? 2048,
      retryAttempts: config.retryAttempts ?? 3,
      retryDelay: config.retryDelay ?? 1000
    };
  }

  /**
   * Evaluate a single prompt using Gemini
   */
  async evaluate(
    template: PromptTemplate,
    variables: Record<string, string>
  ): Promise<JudgeResponse> {
    const prompt = fillTemplate(template.template, variables);
    
    let lastError: Error | null = null;
    
    for (let attempt = 0; attempt < this.config.retryAttempts; attempt++) {
      try {
        const response = await this.generateWithGemini(prompt);
        const parsed = template.parser(response);
        
        // Validate the score is in range
        if (parsed.score < 0 || parsed.score > 1) {
          throw new Error(`Invalid score: ${parsed.score}. Must be between 0 and 1.`);
        }
        
        return parsed;
      } catch (error) {
        lastError = error as Error;
        console.error(`Attempt ${attempt + 1} failed:`, error);
        
        // Wait before retrying
        if (attempt < this.config.retryAttempts - 1) {
          await this.sleep(this.config.retryDelay * (attempt + 1));
        }
      }
    }
    
    // All attempts failed
    throw new Error(
      `Failed to evaluate after ${this.config.retryAttempts} attempts. Last error: ${lastError?.message}`
    );
  }

  /**
   * Batch evaluate multiple prompts
   */
  async batchEvaluate(
    evaluations: Array<{
      template: PromptTemplate;
      variables: Record<string, string>;
    }>,
    concurrency: number = 3
  ): Promise<JudgeResponse[]> {
    const results: JudgeResponse[] = [];
    
    // Process in batches to avoid rate limits
    for (let i = 0; i < evaluations.length; i += concurrency) {
      const batch = evaluations.slice(i, i + concurrency);
      const batchPromises = batch.map(({ template, variables }) =>
        this.evaluate(template, variables)
      );
      
      const batchResults = await Promise.all(batchPromises);
      results.push(...batchResults);
      
      // Small delay between batches to avoid rate limits
      if (i + concurrency < evaluations.length) {
        await this.sleep(500);
      }
    }
    
    return results;
  }

  /**
   * Generate text using Gemini via AI SDK
   */
  private async generateWithGemini(prompt: string): Promise<string> {
    const model = google(this.config.model);

    const { text } = await generateText({
      model,
      prompt,
      temperature: this.config.temperature
    });

    return text;
  }

  /**
   * Sleep helper for retry delays
   */
  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * Test connection to Gemini API
   */
  async testConnection(): Promise<boolean> {
    try {
      const response = await this.generateWithGemini('Say "OK" if you can read this.');
      return response.toLowerCase().includes('ok');
    } catch (error) {
      console.error('Gemini connection test failed:', error);
      return false;
    }
  }

  /**
   * Get estimated cost for evaluation
   * Note: Gemini pricing varies by model
   */
  estimateCost(numSamples: number, numMetrics: number): {
    estimatedTokens: number;
    estimatedCostUSD: number;
  } {
    // Rough estimates based on average prompt/response sizes
    const tokensPerPrompt = 500; // Input
    const tokensPerResponse = 300; // Output
    const totalTokens = numSamples * numMetrics * (tokensPerPrompt + tokensPerResponse);
    
    // Gemini 2.5 Flash pricing (as of 2025)
    // Input: $0.075 / 1M tokens, Output: $0.30 / 1M tokens
    const inputCost = (numSamples * numMetrics * tokensPerPrompt / 1_000_000) * 0.075;
    const outputCost = (numSamples * numMetrics * tokensPerResponse / 1_000_000) * 0.30;
    
    return {
      estimatedTokens: totalTokens,
      estimatedCostUSD: inputCost + outputCost
    };
  }
}

/**
 * Create a Gemini Judge instance with API key from environment
 */
export function createGeminiJudge(
  config?: Partial<GeminiJudgeConfig>
): GeminiJudge {
  const apiKey = config?.apiKey || process.env.GOOGLE_GENERATIVE_AI_API_KEY;
  
  if (!apiKey) {
    throw new Error(
      'GOOGLE_GENERATIVE_AI_API_KEY is required. Set it in your .env.local file.'
    );
  }

  return new GeminiJudge({
    apiKey,
    model: config?.model || 'gemini-2.5-flash-lite',
    temperature: config?.temperature ?? 0.1,
    maxTokens: config?.maxTokens ?? 2048,
    retryAttempts: config?.retryAttempts ?? 3,
    retryDelay: config?.retryDelay ?? 1000
  });
}
