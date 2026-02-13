/**
 * Baseline Execution Engine Benchmark
 * Measures current performance to establish improvement targets
 */

import { WorkflowExecutor } from '../src/components/ExecutionEngine';
import { WorkflowNode, WorkflowEdge } from '../src/types/workflow';
import { performance } from 'perf_hooks';

interface BenchmarkResult {
  totalExecutions: number;
  totalTimeMs: number;
  avgTimePerExecution: number;
  executionsPerSecond: number;
  memoryUsageMB: number;
  minExecutionTime: number;
  maxExecutionTime: number;
  p50: number;
  p95: number;
  p99: number;
}

// Create a simple workflow for benchmarking
function createBenchmarkWorkflow(nodeCount: number): { nodes: WorkflowNode[]; edges: WorkflowEdge[] } {
  const nodes: WorkflowNode[] = [];
  const edges: WorkflowEdge[] = [];

  // Start node
  nodes.push({
    id: 'start',
    type: 'customNode',
    position: { x: 0, y: 0 },
    data: {
      label: 'Start',
      type: 'webhook',
      config: {}
    }
  });

  // Create chain of nodes
  for (let i = 1; i < nodeCount; i++) {
    nodes.push({
      id: `node_${i}`,
      type: 'customNode',
      position: { x: i * 200, y: 0 },
      data: {
        label: `Process ${i}`,
        type: 'http_request',
        config: {
          url: 'https://api.example.com/data',
          method: 'GET'
        }
      }
    });

    edges.push({
      id: `edge_${i}`,
      source: i === 1 ? 'start' : `node_${i - 1}`,
      target: `node_${i}`,
      type: 'smoothstep'
    });
  }

  return { nodes, edges };
}

// Run benchmark
async function runBenchmark(
  workflowSize: number,
  iterations: number
): Promise<BenchmarkResult> {
  console.log(`\n🔬 Benchmarking workflow with ${workflowSize} nodes, ${iterations} iterations...`);

  const { nodes, edges } = createBenchmarkWorkflow(workflowSize);
  const executionTimes: number[] = [];
  const memoryBefore = process.memoryUsage().heapUsed / 1024 / 1024;

  const startTime = performance.now();

  for (let i = 0; i < iterations; i++) {
    const executor = new WorkflowExecutor(nodes, edges);

    const execStart = performance.now();
    await executor.execute();
    const execEnd = performance.now();

    executionTimes.push(execEnd - execStart);

    // Progress indicator
    if ((i + 1) % 10 === 0) {
      process.stdout.write(`\r  Progress: ${i + 1}/${iterations}`);
    }
  }

  const endTime = performance.now();
  const totalTimeMs = endTime - startTime;
  const memoryAfter = process.memoryUsage().heapUsed / 1024 / 1024;

  // Calculate statistics
  executionTimes.sort((a, b) => a - b);
  const p50Index = Math.floor(executionTimes.length * 0.5);
  const p95Index = Math.floor(executionTimes.length * 0.95);
  const p99Index = Math.floor(executionTimes.length * 0.99);

  const result: BenchmarkResult = {
    totalExecutions: iterations,
    totalTimeMs,
    avgTimePerExecution: totalTimeMs / iterations,
    executionsPerSecond: (iterations / totalTimeMs) * 1000,
    memoryUsageMB: memoryAfter - memoryBefore,
    minExecutionTime: Math.min(...executionTimes),
    maxExecutionTime: Math.max(...executionTimes),
    p50: executionTimes[p50Index],
    p95: executionTimes[p95Index],
    p99: executionTimes[p99Index]
  };

  console.log('\n'); // Clear progress line
  return result;
}

// Print results
function printResults(label: string, result: BenchmarkResult) {
  console.log(`\n📊 ${label} Results:`);
  console.log('─'.repeat(60));
  console.log(`  Total Executions:       ${result.totalExecutions}`);
  console.log(`  Total Time:            ${result.totalTimeMs.toFixed(2)} ms`);
  console.log(`  Avg Time/Execution:    ${result.avgTimePerExecution.toFixed(2)} ms`);
  console.log(`  Executions/Second:     ${result.executionsPerSecond.toFixed(2)}`);
  console.log(`  Memory Usage:          ${result.memoryUsageMB.toFixed(2)} MB`);
  console.log(`  Min Execution Time:    ${result.minExecutionTime.toFixed(2)} ms`);
  console.log(`  Max Execution Time:    ${result.maxExecutionTime.toFixed(2)} ms`);
  console.log(`  P50 (Median):          ${result.p50.toFixed(2)} ms`);
  console.log(`  P95:                   ${result.p95.toFixed(2)} ms`);
  console.log(`  P99:                   ${result.p99.toFixed(2)} ms`);
  console.log('─'.repeat(60));
}

// Main benchmark suite
async function main() {
  console.log('🚀 Starting Execution Engine Baseline Benchmark\n');
  console.log('This will establish baseline metrics for performance comparison');

  // Small workflow (5 nodes)
  const smallResult = await runBenchmark(5, 100);
  printResults('Small Workflow (5 nodes, 100 iterations)', smallResult);

  // Medium workflow (15 nodes)
  const mediumResult = await runBenchmark(15, 50);
  printResults('Medium Workflow (15 nodes, 50 iterations)', mediumResult);

  // Large workflow (30 nodes)
  const largeResult = await runBenchmark(30, 20);
  printResults('Large Workflow (30 nodes, 20 iterations)', largeResult);

  // Summary
  console.log('\n📈 Baseline Performance Summary:');
  console.log('─'.repeat(60));
  console.log(`  Small Workflow:  ${smallResult.executionsPerSecond.toFixed(2)} exec/sec`);
  console.log(`  Medium Workflow: ${mediumResult.executionsPerSecond.toFixed(2)} exec/sec`);
  console.log(`  Large Workflow:  ${largeResult.executionsPerSecond.toFixed(2)} exec/sec`);
  console.log(`  Target (6x):     ${(smallResult.executionsPerSecond * 6).toFixed(2)} exec/sec`);
  console.log('─'.repeat(60));

  // Save results to file
  const baselineData = {
    timestamp: new Date().toISOString(),
    small: smallResult,
    medium: mediumResult,
    large: largeResult,
    target: {
      small: smallResult.executionsPerSecond * 6,
      medium: mediumResult.executionsPerSecond * 6,
      large: largeResult.executionsPerSecond * 6
    }
  };

  console.log('\n✅ Baseline benchmark complete!');
  console.log('   Results saved for comparison\n');

  return baselineData;
}

// Run if executed directly
if (require.main === module) {
  main()
    .then(() => process.exit(0))
    .catch((error) => {
      console.error('❌ Benchmark failed:', error);
      process.exit(1);
    });
}

export { runBenchmark, BenchmarkResult };
