#!/usr/bin/env tsx

/**
 * Generate answers script
 * 
 * This script:
 * 1. Loads a dataset CSV (input, expected_output, metadata)
 * 2. Generates answers using the chat system directly
 * 3. Adds a 'generation' column with the generated answers
 * 4. Saves the enriched dataset to a new CSV file
 * 5. Respects Gemini 2.5 Flash rate limits (1000 RPM, 1M TPM)
 */

import Papa from 'papaparse';
import fs from 'fs/promises';
import path from 'path';

// ============================================================================
// Types
// ============================================================================

interface DatasetRow {
  input: string;
  expected_output: string;
  metadata: string;
  generation?: string;
}

interface GenerationStats {
  total: number;
  completed: number;
  failed: number;
  totalTokens: number;
  startTime: number;
}

// ============================================================================
// Rate Limiting Configuration
// ============================================================================

const RATE_LIMITS = {
  RPM: 1000,        // Requests per minute
  TPM: 1_000_000,   // Tokens per minute
  RPD: 10_000,      // Requests per day
};

// Safe limits with 20% margin
const SAFE_LIMITS = {
  RPM: Math.floor(RATE_LIMITS.RPM * 0.8),  // 800 requests/min
  TPM: Math.floor(RATE_LIMITS.TPM * 0.8),  // 800k tokens/min
  delayBetweenRequests: 100,  // 100ms between requests = max 600/min
};

// ============================================================================
// Chat System Integration via /api/generate
// ============================================================================

async function generateAnswer(question: string, metadata?: any): Promise<string> {
  try {
    const apiUrl = process.env.GENERATE_API_URL || 'http://localhost:3000/api/generate';
    
    // Call the /api/generate endpoint
    const response = await fetch(apiUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        message: question,
        chatModel: 'chat-model',
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`API error: ${response.status} - ${errorText}`);
    }

    const result = await response.json();
    
    if (!result.success) {
      throw new Error(result.error || 'Unknown error from API');
    }

    return result.answer;
  } catch (error) {
    console.error('Error generating answer:', error);
    throw error;
  }
}

// ============================================================================
// Rate Limiting Helper
// ============================================================================// ============================================================================
// Rate Limiting Helper
// ============================================================================

class RateLimiter {
  private requestTimestamps: number[] = [];
  private tokenCount = 0;
  private lastResetTime = Date.now();

  async waitIfNeeded(estimatedTokens: number = 500): Promise<void> {
    const now = Date.now();
    
    // Reset token count every minute
    if (now - this.lastResetTime > 60000) {
      this.tokenCount = 0;
      this.lastResetTime = now;
    }

    // Remove timestamps older than 1 minute
    this.requestTimestamps = this.requestTimestamps.filter(
      ts => now - ts < 60000
    );

    // Check if we need to wait
    const needsWaitForRPM = this.requestTimestamps.length >= SAFE_LIMITS.RPM;
    const needsWaitForTPM = this.tokenCount + estimatedTokens > SAFE_LIMITS.TPM;

    if (needsWaitForRPM || needsWaitForTPM) {
      const oldestRequest = this.requestTimestamps[0] || now;
      const waitTime = 60000 - (now - oldestRequest) + 1000; // +1s buffer
      
      console.log(`⏳ Rate limit approaching, waiting ${Math.ceil(waitTime / 1000)}s...`);
      await this.sleep(waitTime);
      
      // Reset after waiting
      this.requestTimestamps = [];
      this.tokenCount = 0;
      this.lastResetTime = Date.now();
    }

    // Add small delay between requests
    await this.sleep(SAFE_LIMITS.delayBetweenRequests);

    // Track this request
    this.requestTimestamps.push(Date.now());
    this.tokenCount += estimatedTokens;
  }

  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  getStats() {
    const now = Date.now();
    const recentRequests = this.requestTimestamps.filter(ts => now - ts < 60000);
    return {
      requestsInLastMinute: recentRequests.length,
      tokensInLastMinute: this.tokenCount,
      utilizationRPM: (recentRequests.length / SAFE_LIMITS.RPM * 100).toFixed(1) + '%',
      utilizationTPM: (this.tokenCount / SAFE_LIMITS.TPM * 100).toFixed(1) + '%',
    };
  }
}

// ============================================================================
// Main Generation Logic
// ============================================================================

async function generateAnswersForDataset(
  datasetPath: string,
  options: {
    maxSamples?: number;
    skipExisting?: boolean;
    outputPath?: string;
  } = {}
): Promise<void> {
  const { maxSamples, skipExisting = true, outputPath } = options;

  console.log('📊 Loading dataset...');
  
  // Read CSV file
  const csvContent = await fs.readFile(datasetPath, 'utf-8');
  const parseResult = Papa.parse<DatasetRow>(csvContent, {
    header: true,
    skipEmptyLines: true,
  });

  let rows = parseResult.data;
  const total = maxSamples ? Math.min(rows.length, maxSamples) : rows.length;

  console.log(`📝 Found ${rows.length} questions`);
  if (maxSamples) {
    console.log(`🎯 Processing first ${total} samples`);
    rows = rows.slice(0, maxSamples);
  }

  const stats: GenerationStats = {
    total,
    completed: 0,
    failed: 0,
    totalTokens: 0,
    startTime: Date.now(),
  };

  const rateLimiter = new RateLimiter();

  console.log('\n🚀 Starting answer generation...');
  console.log('🤖 Using /api/generate endpoint (same config as chat)');
  console.log('✅ RAG (retrieveKnowledge) enabled');
  console.log('� API URL:', process.env.GENERATE_API_URL || 'http://localhost:3000/api/generate');
  console.log('⚠️  Make sure dev server is running: pnpm dev\n');

  // Process each row
  for (let i = 0; i < rows.length; i++) {
    const row = rows[i];
    
    // Skip if generation already exists and skipExisting is true
    if (skipExisting && row.generation) {
      console.log(`⏭️  [${i + 1}/${total}] Skipping (already generated)`);
      stats.completed++;
      continue;
    }

    try {
      // Wait for rate limits
      await rateLimiter.waitIfNeeded();

      // Generate answer
      const question = row.input;
      console.log(`\n❓ [${i + 1}/${total}] Question: ${question.substring(0, 80)}...`);
      
      const answer = await generateAnswer(question, row.metadata);
      
      // Update row with generated answer
      row.generation = answer;
      stats.completed++;

      // Estimate tokens (rough: 1 token ≈ 4 chars for French)
      const estimatedTokens = Math.ceil((question.length + answer.length) / 4);
      stats.totalTokens += estimatedTokens;

      console.log(`✅ Generated (${estimatedTokens} tokens est.)`);
      console.log(`📝 Answer: ${answer.substring(0, 100)}...`);
      
      // Show rate limit stats every 10 requests
      if ((i + 1) % 10 === 0) {
        const limiterStats = rateLimiter.getStats();
        console.log(`\n📊 Rate Limit Stats: ${limiterStats.requestsInLastMinute} req/min (${limiterStats.utilizationRPM}), ${limiterStats.tokensInLastMinute} tokens/min (${limiterStats.utilizationTPM})\n`);
      }
    } catch (error) {
      console.error(`❌ [${i + 1}/${total}] Failed:`, error);
      stats.failed++;
      
      // Add error marker
      row.generation = `[ERROR: ${error instanceof Error ? error.message : 'Unknown error'}]`;
    }

    // Progress update
    const progress = ((i + 1) / total * 100).toFixed(1);
    console.log(`📈 Progress: ${progress}% (${stats.completed} completed, ${stats.failed} failed)\n`);
  }

  // Save enriched dataset
  const outputFilePath = outputPath || datasetPath.replace('.csv', '_with_generations.csv');
  const csv = Papa.unparse(rows, {
    header: true,
    quotes: true,
  });

  await fs.writeFile(outputFilePath, csv, 'utf-8');

  // Final stats
  const duration = (Date.now() - stats.startTime) / 1000;
  console.log('\n' + '='.repeat(60));
  console.log('✅ Generation Complete!');
  console.log('='.repeat(60));
  console.log(`📁 Output: ${outputFilePath}`);
  console.log(`⏱️  Duration: ${duration.toFixed(1)}s`);
  console.log(`✅ Completed: ${stats.completed}/${stats.total}`);
  console.log(`❌ Failed: ${stats.failed}/${stats.total}`);
  console.log(`🔤 Total tokens (est.): ${stats.totalTokens.toLocaleString()}`);
  console.log(`⚡ Avg speed: ${(stats.completed / (duration / 60)).toFixed(1)} generations/min`);
  console.log('='.repeat(60) + '\n');
}

// ============================================================================
// CLI Interface
// ============================================================================

async function main() {
  const args = process.argv.slice(2);
  
  // Parse arguments
  let datasetName = 'esn_qa_dataset';
  let maxSamples: number | undefined;
  let skipExisting = true;
  let outputPath: string | undefined;

  for (let i = 0; i < args.length; i++) {
    const arg = args[i];
    if (arg === '--dataset' || arg === '-d') {
      datasetName = args[++i];
    } else if (arg === '--max-samples' || arg === '-n') {
      maxSamples = parseInt(args[++i], 10);
    } else if (arg === '--no-skip' || arg === '-f') {
      skipExisting = false;
    } else if (arg === '--output' || arg === '-o') {
      outputPath = args[++i];
    } else if (arg === '--help' || arg === '-h') {
      console.log(`
Usage: pnpm generate-answers [options]

Options:
  --dataset, -d <name>       Dataset name (default: esn_qa_dataset)
  --max-samples, -n <num>    Max number of samples to process
  --no-skip, -f              Regenerate even if generation exists
  --output, -o <path>        Output file path
  --help, -h                 Show this help

Examples:
  pnpm generate-answers
  pnpm generate-answers --dataset esn_qa_dataset --max-samples 10
  pnpm generate-answers -d my_dataset -n 50 -o output.csv

Rate Limits (Gemini 2.5 Flash):
  - 1,000 RPM (Requests Per Minute)
  - 1,000,000 TPM (Tokens Per Minute)
  - Script uses safe limits: 800 RPM, 800k TPM
      `);
      process.exit(0);
    }
  }

  // Construct dataset path
  const datasetPath = path.join(process.cwd(), 'datasets', `${datasetName}.csv`);

  // Check if file exists
  try {
    await fs.access(datasetPath);
  } catch {
    console.error(`❌ Dataset not found: ${datasetPath}`);
    console.error('💡 Available datasets:');
    const datasetsDir = path.join(process.cwd(), 'datasets');
    const files = await fs.readdir(datasetsDir);
    files.filter(f => f.endsWith('.csv')).forEach(f => {
      console.error(`   - ${f.replace('.csv', '')}`);
    });
    process.exit(1);
  }

  // Run generation
  try {
    await generateAnswersForDataset(datasetPath, {
      maxSamples,
      skipExisting,
      outputPath,
    });
  } catch (error) {
    console.error('\n❌ Generation failed:', error);
    process.exit(1);
  }
}

// Run if called directly
if (require.main === module) {
  main().catch(console.error);
}

export { generateAnswersForDataset };
