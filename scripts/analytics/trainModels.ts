/**
 * ML Model Training Script
 *
 * Train predictive analytics models with historical data:
 * - Execution time prediction
 * - Failure prediction
 * - Cost prediction
 * - Model evaluation and persistence
 *
 * Usage: tsx scripts/analytics/trainModels.ts [--data-file <path>] [--save-models]
 */

import { MLModelManager, WorkflowExecutionData } from '../../src/analytics/MLModels';
import { getPredictiveAnalyticsEngine } from '../../src/analytics/PredictiveAnalytics';
import * as fs from 'fs';
import * as path from 'path';

// ============================================================================
// Configuration
// ============================================================================

interface TrainingConfig {
  dataFile?: string;
  saveModels: boolean;
  modelPath: string;
  minSamples: number;
  validationSplit: number;
  verbose: boolean;
}

const DEFAULT_CONFIG: TrainingConfig = {
  saveModels: true,
  modelPath: 'models/analytics',
  minSamples: 50,
  validationSplit: 0.2,
  verbose: true,
};

// ============================================================================
// Data Generation
// ============================================================================

function generateTrainingData(count: number): WorkflowExecutionData[] {
  const data: WorkflowExecutionData[] = [];
  const now = Date.now();

  console.log(`Generating ${count} training samples...`);

  for (let i = 0; i < count; i++) {
    const timestamp = now - i * 3600000; // 1 hour intervals

    const nodeCount = 3 + Math.floor(Math.random() * 20);
    const edgeCount = nodeCount - 1 + Math.floor(Math.random() * 5);
    const hasLoops = Math.random() > 0.7;
    const hasConditionals = Math.random() > 0.5;
    const hasParallelExecution = Math.random() > 0.6;
    const maxDepth = 2 + Math.floor(Math.random() * 6);
    const avgNodeComplexity = 0.5 + Math.random() * 2.5;

    // Calculate complexity
    let complexity = nodeCount * 1.0;
    complexity += edgeCount * 0.5;
    complexity += maxDepth * 2.0;
    complexity += hasLoops ? 5.0 : 0;
    complexity += hasConditionals ? 3.0 : 0;
    complexity += hasParallelExecution ? 4.0 : 0;

    const networkCalls = Math.floor(Math.random() * 15);
    const dbQueries = Math.floor(Math.random() * 12);

    complexity += networkCalls * 0.3;
    complexity += dbQueries * 0.4;

    // Calculate duration based on complexity (with some noise)
    const baseDuration = 5000; // 5 seconds base
    const complexityFactor = complexity * 1000; // 1 second per complexity point
    const networkFactor = networkCalls * 500; // 500ms per network call
    const dbFactor = dbQueries * 300; // 300ms per DB query
    const noise = (Math.random() - 0.5) * 10000; // ±5 seconds noise

    const duration = Math.max(
      1000,
      baseDuration + complexityFactor + networkFactor + dbFactor + noise
    );

    // Calculate failure probability
    const baseFailureRate = 0.05;
    const complexityFailureRate = Math.min(0.3, complexity * 0.01);
    const errorProbability = baseFailureRate + complexityFailureRate;

    const success = Math.random() > errorProbability;
    const errorCount = success ? 0 : Math.floor(1 + Math.random() * 3);
    const retryCount = success ? 0 : Math.floor(Math.random() * 2);

    // Calculate resource usage
    const cpuUsage = Math.min(100, 10 + nodeCount * 2 + complexity * 0.5 + Math.random() * 20);
    const memoryUsage = 50 + nodeCount * 10 + complexity * 2 + Math.random() * 100;

    // Calculate cost
    const baseCost = 0.001;
    const networkCost = networkCalls * 0.002;
    const dbCost = dbQueries * 0.0015;
    const computeCost = (duration / 1000) * 0.0001;
    const cost = baseCost + networkCost + dbCost + computeCost;

    data.push({
      id: `training-exec-${i}`,
      workflowId: `workflow-${Math.floor(Math.random() * 10)}`,
      nodeCount,
      edgeCount,
      complexity,
      duration,
      success,
      errorCount,
      retryCount,
      cpuUsage,
      memoryUsage,
      networkCalls,
      dbQueries,
      cost,
      timestamp,
      timeOfDay: new Date(timestamp).getHours(),
      dayOfWeek: new Date(timestamp).getDay(),
      hasLoops,
      hasConditionals,
      hasParallelExecution,
      maxDepth,
      avgNodeComplexity,
    });

    if ((i + 1) % 100 === 0) {
      console.log(`  Generated ${i + 1}/${count} samples...`);
    }
  }

  console.log(`✓ Generated ${count} training samples`);
  return data;
}

// ============================================================================
// Data Loading
// ============================================================================

function loadTrainingData(filePath: string): WorkflowExecutionData[] {
  console.log(`Loading training data from ${filePath}...`);

  if (!fs.existsSync(filePath)) {
    throw new Error(`Data file not found: ${filePath}`);
  }

  const content = fs.readFileSync(filePath, 'utf-8');
  const data = JSON.parse(content);

  if (!Array.isArray(data)) {
    throw new Error('Invalid data format: expected array');
  }

  console.log(`✓ Loaded ${data.length} samples from file`);
  return data;
}

// ============================================================================
// Model Training
// ============================================================================

async function trainModels(data: WorkflowExecutionData[], config: TrainingConfig) {
  console.log('\n='.repeat(60));
  console.log('ML MODEL TRAINING');
  console.log('='.repeat(60));

  // Validate data
  if (data.length < config.minSamples) {
    throw new Error(
      `Insufficient data: ${data.length} samples (minimum: ${config.minSamples})`
    );
  }

  console.log(`\nTraining with ${data.length} samples...`);
  console.log(`Validation split: ${config.validationSplit * 100}%\n`);

  // Initialize ML Manager
  const mlManager = new MLModelManager();

  // Train all models
  console.log('Training models...\n');
  const startTime = Date.now();

  const metrics = await mlManager.trainAll(data);

  const trainingTime = Date.now() - startTime;

  // Display results
  console.log('\n' + '='.repeat(60));
  console.log('TRAINING RESULTS');
  console.log('='.repeat(60));

  console.log(`\nTotal training time: ${(trainingTime / 1000).toFixed(2)}s\n`);

  // Execution Time Model
  console.log('1. Execution Time Prediction Model:');
  console.log(`   - MSE: ${metrics.executionTime.mse?.toFixed(2)}`);
  console.log(`   - RMSE: ${metrics.executionTime.rmse?.toFixed(2)} ms`);
  console.log(`   - MAE: ${metrics.executionTime.mae?.toFixed(2)} ms`);
  console.log(`   - R²: ${metrics.executionTime.r2?.toFixed(4)}`);
  console.log(`   - Samples: ${metrics.executionTime.sampleCount}`);
  console.log(`   - Training time: ${(metrics.executionTime.trainingTime / 1000).toFixed(2)}s`);

  // Failure Prediction Model
  console.log('\n2. Failure Prediction Model:');
  console.log(`   - Accuracy: ${((metrics.failure.accuracy || 0) * 100).toFixed(2)}%`);
  console.log(`   - Precision: ${((metrics.failure.precision || 0) * 100).toFixed(2)}%`);
  console.log(`   - Recall: ${((metrics.failure.recall || 0) * 100).toFixed(2)}%`);
  console.log(`   - F1 Score: ${((metrics.failure.f1Score || 0) * 100).toFixed(2)}%`);
  console.log(`   - Samples: ${metrics.failure.sampleCount}`);
  console.log(`   - Training time: ${(metrics.failure.trainingTime / 1000).toFixed(2)}s`);

  // Cost Prediction Model
  console.log('\n3. Cost Prediction Model:');
  console.log(`   - MSE: ${metrics.cost.mse?.toFixed(6)}`);
  console.log(`   - RMSE: ${metrics.cost.rmse?.toFixed(6)}`);
  console.log(`   - MAE: ${metrics.cost.mae?.toFixed(6)}`);
  console.log(`   - R²: ${metrics.cost.r2?.toFixed(4)}`);
  console.log(`   - Samples: ${metrics.cost.sampleCount}`);
  console.log(`   - Training time: ${(metrics.cost.trainingTime / 1000).toFixed(2)}s`);

  // Save models
  if (config.saveModels) {
    console.log(`\nSaving models to ${config.modelPath}...`);

    // Create directory if it doesn't exist
    const modelDir = path.dirname(config.modelPath);
    if (!fs.existsSync(modelDir)) {
      fs.mkdirSync(modelDir, { recursive: true });
    }

    try {
      await mlManager.saveAll(config.modelPath);
      console.log('✓ Models saved successfully');
    } catch (err) {
      console.error('✗ Failed to save models:', err);
    }
  }

  console.log('\n' + '='.repeat(60));
  console.log('TRAINING COMPLETE');
  console.log('='.repeat(60) + '\n');

  return metrics;
}

// ============================================================================
// Model Evaluation
// ============================================================================

async function evaluateModels(
  mlManager: MLModelManager,
  testData: WorkflowExecutionData[]
) {
  console.log('\n' + '='.repeat(60));
  console.log('MODEL EVALUATION');
  console.log('='.repeat(60));

  console.log(`\nEvaluating on ${testData.length} test samples...\n`);

  const predictions = {
    executionTime: [] as number[],
    failure: [] as number[],
    cost: [] as number[],
  };

  const actuals = {
    executionTime: [] as number[],
    failure: [] as number[],
    cost: [] as number[],
  };

  for (const sample of testData) {
    const pred = await mlManager.predictAll(sample);

    predictions.executionTime.push(pred.executionTime.value);
    predictions.failure.push(pred.failureProbability.value);
    predictions.cost.push(pred.cost.value);

    actuals.executionTime.push(sample.duration);
    actuals.failure.push(sample.success ? 0 : 1);
    actuals.cost.push(sample.cost);
  }

  // Calculate evaluation metrics
  console.log('Evaluation Results:');

  // Execution Time
  const durationErrors = predictions.executionTime.map(
    (p, i) => Math.abs(p - actuals.executionTime[i])
  );
  const avgDurationError =
    durationErrors.reduce((sum, e) => sum + e, 0) / durationErrors.length;

  console.log(`\n1. Execution Time:`);
  console.log(`   - Average Error: ${(avgDurationError / 1000).toFixed(2)}s`);
  console.log(
    `   - Error Range: ${(Math.min(...durationErrors) / 1000).toFixed(2)}s - ${(Math.max(...durationErrors) / 1000).toFixed(2)}s`
  );

  // Failure Prediction
  const failureCorrect = predictions.failure.filter((p, i) => {
    const predicted = p > 0.5 ? 1 : 0;
    return predicted === actuals.failure[i];
  }).length;

  const failureAccuracy = (failureCorrect / predictions.failure.length) * 100;

  console.log(`\n2. Failure Prediction:`);
  console.log(`   - Accuracy: ${failureAccuracy.toFixed(2)}%`);

  // Cost Prediction
  const costErrors = predictions.cost.map((p, i) => Math.abs(p - actuals.cost[i]));
  const avgCostError = costErrors.reduce((sum, e) => sum + e, 0) / costErrors.length;

  console.log(`\n3. Cost Prediction:`);
  console.log(`   - Average Error: $${avgCostError.toFixed(6)}`);

  console.log('\n' + '='.repeat(60) + '\n');
}

// ============================================================================
// Main Function
// ============================================================================

async function main() {
  const args = process.argv.slice(2);
  const config = { ...DEFAULT_CONFIG };

  // Parse arguments
  for (let i = 0; i < args.length; i++) {
    if (args[i] === '--data-file' && args[i + 1]) {
      config.dataFile = args[i + 1];
      i++;
    } else if (args[i] === '--save-models') {
      config.saveModels = true;
    } else if (args[i] === '--no-save') {
      config.saveModels = false;
    } else if (args[i] === '--model-path' && args[i + 1]) {
      config.modelPath = args[i + 1];
      i++;
    }
  }

  try {
    // Load or generate training data
    let data: WorkflowExecutionData[];

    if (config.dataFile) {
      data = loadTrainingData(config.dataFile);
    } else {
      console.log('No data file specified, generating synthetic data...\n');
      data = generateTrainingData(500);
    }

    // Split into train/test
    const splitIndex = Math.floor(data.length * (1 - config.validationSplit));
    const trainData = data.slice(0, splitIndex);
    const testData = data.slice(splitIndex);

    console.log(`\nData split:`);
    console.log(`  - Training: ${trainData.length} samples`);
    console.log(`  - Testing: ${testData.length} samples\n`);

    // Train models
    await trainModels(trainData, config);

    // Evaluate on test set
    const mlManager = new MLModelManager();
    await mlManager.trainAll(trainData);
    await evaluateModels(mlManager, testData);

    console.log('✓ Training and evaluation complete!\n');
  } catch (err) {
    console.error('\n✗ Error:', err instanceof Error ? err.message : err);
    process.exit(1);
  }
}

// Run if executed directly
if (require.main === module) {
  main().catch(console.error);
}

export { trainModels, generateTrainingData, loadTrainingData };
