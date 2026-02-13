/**
 * LLMOps Comprehensive Tests
 * 42+ tests covering all LLMOps functionality
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { DatasetPreparer } from '../finetuning/DatasetPreparer';
import { ModelEvaluator } from '../finetuning/ModelEvaluator';
import { FineTuningPipeline } from '../finetuning/FineTuningPipeline';
import { PromptRegistry } from '../prompts/PromptRegistry';
import { PromptVersioning } from '../prompts/PromptVersioning';
import { PromptTesting } from '../prompts/PromptTesting';
import { HallucinationDetector } from '../hallucination/HallucinationDetector';
import { FactChecker } from '../hallucination/FactChecker';
import { ModelMonitoring } from '../monitoring/ModelMonitoring';
import { DriftDetection } from '../monitoring/DriftDetection';
import { PromptABTesting } from '../abtesting/PromptABTesting';
import { ModelRouter } from '../models/ModelRouter';
import { ModelRegistry } from '../models/ModelRegistry';

// ============================================================================
// DATASET PREPARATION TESTS
// ============================================================================

describe('DatasetPreparer', () => {
  let preparer: DatasetPreparer;

  beforeEach(() => {
    preparer = new DatasetPreparer();
  });

  it('should prepare dataset from examples', async () => {
    const examples = Array.from({ length: 15 }, (_, i) => ({
      prompt: `Hello ${i}`,
      completion: `Hi there ${i}!`,
    }));

    const dataset = await preparer.prepareDataset(examples, { format: 'jsonl' });

    expect(dataset).toBeDefined();
    expect(dataset.examples.length).toBe(15);
    expect(dataset.format).toBe('jsonl');
  });

  it('should validate examples', async () => {
    const valid = Array.from({ length: 15 }, (_, i) => ({
      prompt: `Test ${i}`,
      completion: `Response ${i}`,
    }));
    const result = await preparer.validateExamples(valid);

    expect(result.valid).toBe(true);
    expect(result.errors.length).toBe(0);
  });

  it('should detect missing fields', async () => {
    const invalid = [{ prompt: '', completion: 'Response' }];
    const result = await preparer.validateExamples(invalid as any);

    expect(result.valid).toBe(false);
    expect(result.errors.length).toBeGreaterThan(0);
  });

  it('should convert to JSONL format', async () => {
    const examples = Array.from({ length: 15 }, (_, i) => ({
      prompt: `Test ${i}`,
      completion: `Response ${i}`,
    }));
    const dataset = await preparer.prepareDataset(examples, { format: 'jsonl' });

    const jsonl = preparer.toJSONL(dataset);

    expect(jsonl).toContain('Test');
    expect(jsonl).toContain('Response');
  });

  it('should convert to CSV format', async () => {
    const examples = Array.from({ length: 15 }, (_, i) => ({
      prompt: `Test ${i}`,
      completion: `Response ${i}`,
    }));
    const dataset = await preparer.prepareDataset(examples, { format: 'csv' });

    const csv = preparer.toCSV(dataset);

    expect(csv).toContain('prompt,completion');
    expect(csv).toContain('Test');
  });
});

// ============================================================================
// MODEL EVALUATION TESTS
// ============================================================================

describe('ModelEvaluator', () => {
  let evaluator: ModelEvaluator;

  beforeEach(() => {
    evaluator = new ModelEvaluator();
  });

  it('should evaluate model', async () => {
    const preparer = new DatasetPreparer();
    const examples = Array.from({ length: 15 }, (_, i) => ({
      prompt: `Test ${i}`,
      completion: `Response ${i}`,
    }));
    const testSet = await preparer.prepareDataset(examples, { format: 'jsonl' });

    const metrics = await evaluator.evaluate('test-model', {
      metrics: ['loss', 'accuracy'],
      testSet,
    });

    expect(metrics).toBeDefined();
    expect(metrics.loss).toBeGreaterThanOrEqual(0);
    expect(metrics.perplexity).toBeGreaterThan(0);
  });

  it('should benchmark models', async () => {
    const preparer = new DatasetPreparer();
    const examples = Array.from({ length: 15 }, (_, i) => ({
      prompt: `Test ${i}`,
      completion: `Response ${i}`,
    }));
    const testSet = await preparer.prepareDataset(examples, { format: 'jsonl' });

    const results = await evaluator.benchmark({
      baselineModel: 'model-a',
      fineTunedModel: 'model-b',
      testSet,
      metrics: ['loss', 'accuracy'],
    });

    expect(results).toBeDefined();
    expect(results.baseline).toBeDefined();
    expect(results.fineTuned).toBeDefined();
    expect(['baseline', 'fine-tuned', 'tie']).toContain(results.winner);
  });

  it('should tune hyperparameters', async () => {
    const config = {
      baseModel: 'gpt-3.5-turbo',
      modelName: 'test-model',
      datasetId: 'dataset-1',
      hyperparameters: {},
      method: 'full' as const,
    };

    const tuning = await evaluator.tuneHyperparameters(config, {
      method: 'grid-search',
      searchSpace: {
        learningRate: [1e-5, 1e-4],
        batchSize: [4, 8],
        epochs: [3, 5],
      },
    });

    expect(tuning).toBeDefined();
    expect(tuning.trials.length).toBeGreaterThan(0);
    expect(tuning.bestConfig).toBeDefined();
    expect(tuning.bestScore).toBeGreaterThan(0);
  });
});

// ============================================================================
// FINE-TUNING PIPELINE TESTS
// ============================================================================

describe('FineTuningPipeline', () => {
  let pipeline: FineTuningPipeline;

  beforeEach(() => {
    pipeline = new FineTuningPipeline({
      provider: 'openai',
      apiKey: 'test-key',
    });
  });

  it('should prepare dataset', async () => {
    const examples = Array.from({ length: 15 }, (_, i) => ({
      prompt: `Test ${i}`,
      completion: `Response ${i}`,
    }));
    const dataset = await pipeline.prepareDataset(examples);

    expect(dataset).toBeDefined();
    expect(dataset.id).toBeDefined();
  });

  it('should start fine-tuning job', async () => {
    const config = {
      baseModel: 'gpt-3.5-turbo',
      modelName: 'test-model',
      datasetId: 'dataset-1',
      hyperparameters: { epochs: 3 },
      method: 'full' as const,
    };

    const job = await pipeline.fineTune(config);

    expect(job).toBeDefined();
    expect(job.id).toBeDefined();
    expect(['pending', 'running']).toContain(job.status);
  });

  it('should get job status', async () => {
    const config = {
      baseModel: 'gpt-3.5-turbo',
      modelName: 'test-model',
      datasetId: 'dataset-1',
      hyperparameters: {},
      method: 'full' as const,
    };

    const job = await pipeline.fineTune(config);
    const retrieved = pipeline.getJob(job.id);

    expect(retrieved).toBeDefined();
    expect(retrieved?.id).toBe(job.id);
  });

  it('should cancel job', async () => {
    const config = {
      baseModel: 'gpt-3.5-turbo',
      modelName: 'test-model',
      datasetId: 'dataset-1',
      hyperparameters: {},
      method: 'full' as const,
    };

    const job = await pipeline.fineTune(config);
    await pipeline.cancelJob(job.id);

    const retrieved = pipeline.getJob(job.id);
    expect(retrieved?.status).toBe('cancelled');
  });
});

// ============================================================================
// PROMPT REGISTRY TESTS
// ============================================================================

describe('PromptRegistry', () => {
  let registry: PromptRegistry;

  beforeEach(() => {
    registry = new PromptRegistry();
  });

  it('should create prompt', async () => {
    const prompt = await registry.create({
      name: 'Test Prompt',
      description: 'A test prompt',
      template: 'Hello {{name}}',
      variables: [{ name: 'name', type: 'string', description: 'User name', required: true }],
      examples: [],
      modelConfig: {
        model: 'gpt-3.5-turbo',
        temperature: 0.7,
        maxTokens: 100,
      },
      tags: ['test'],
      author: 'test-user',
      status: 'active',
    });

    expect(prompt).toBeDefined();
    expect(prompt.id).toBeDefined();
    expect(prompt.version).toBe('1.0.0');
  });

  it('should get prompt by ID', async () => {
    const created = await registry.create({
      name: 'Test',
      description: 'Test',
      template: 'Test',
      variables: [],
      examples: [],
      modelConfig: { model: 'gpt-3.5-turbo', temperature: 0.7, maxTokens: 100 },
      tags: [],
      author: 'test',
      status: 'active',
    });

    const retrieved = registry.get(created.id);

    expect(retrieved).toBeDefined();
    expect(retrieved?.id).toBe(created.id);
  });

  it('should search prompts', async () => {
    await registry.create({
      name: 'Test 1',
      description: 'Test',
      template: 'Test',
      variables: [],
      examples: [],
      modelConfig: { model: 'gpt-3.5-turbo', temperature: 0.7, maxTokens: 100 },
      tags: ['category-a'],
      author: 'test',
      status: 'active',
    });

    const results = registry.search({ tags: ['category-a'] });

    expect(results.length).toBeGreaterThan(0);
  });

  it('should validate prompt', () => {
    const result = registry.validate({
      name: 'Test',
      template: 'Hello {{name}}',
      variables: [{ name: 'name', type: 'string', description: 'Name', required: true }],
    });

    expect(result.valid).toBe(true);
    expect(result.errors.length).toBe(0);
  });

  it('should detect undeclared variables', () => {
    const result = registry.validate({
      name: 'Test',
      template: 'Hello {{name}} and {{age}}',
      variables: [{ name: 'name', type: 'string', description: 'Name', required: true }],
    });

    expect(result.valid).toBe(false);
    expect(result.errors.some((e) => e.includes('age'))).toBe(true);
  });
});

// ============================================================================
// PROMPT VERSIONING TESTS
// ============================================================================

describe('PromptVersioning', () => {
  let versioning: PromptVersioning;

  beforeEach(() => {
    versioning = new PromptVersioning();
  });

  it('should create version', async () => {
    const version = await versioning.createVersion(
      'prompt-1',
      'Hello {{name}}',
      'Initial version',
      'test-user'
    );

    expect(version).toBeDefined();
    expect(version.version).toBe('0.0.1');
  });

  it('should get version history', async () => {
    await versioning.createVersion('prompt-1', 'V1', 'Version 1', 'user');
    await versioning.createVersion('prompt-1', 'V2', 'Version 2', 'user');

    const history = versioning.getVersionHistory('prompt-1');

    expect(history.length).toBe(2);
  });

  it('should create branch', async () => {
    await versioning.createVersion('prompt-1', 'Main', 'Main', 'user');

    const branch = await versioning.createBranch('prompt-1', 'feature-branch');

    expect(branch).toBeDefined();
    expect(branch.name).toBe('feature-branch');
  });

  it('should tag version', async () => {
    const version = await versioning.createVersion('prompt-1', 'V1', 'V1', 'user');

    await versioning.tagVersion('prompt-1', version.version, 'v1.0');

    const tagged = versioning.getVersionByTag('prompt-1', 'v1.0');

    expect(tagged).toBeDefined();
    expect(tagged?.version).toBe(version.version);
  });
});

// ============================================================================
// HALLUCINATION DETECTION TESTS
// ============================================================================

describe('HallucinationDetector', () => {
  let detector: HallucinationDetector;

  beforeEach(() => {
    detector = new HallucinationDetector();
  });

  it('should detect hallucinations', async () => {
    const result = await detector.detect('What is AI?', 'AI is artificial intelligence', {
      methods: ['factual-consistency'],
      threshold: 0.7,
      groundTruth: 'AI stands for artificial intelligence',
    });

    expect(result).toBeDefined();
    expect(typeof result.isHallucinated).toBe('boolean');
    expect(result.confidence).toBeGreaterThanOrEqual(0);
    expect(result.confidence).toBeLessThanOrEqual(1);
  });

  it('should score confidence', async () => {
    const score = await detector.scoreConfidence('This is a test response');

    expect(score).toBeDefined();
    expect(score.overall).toBeGreaterThanOrEqual(0);
    expect(score.overall).toBeLessThanOrEqual(1);
  });

  it('should have high accuracy target', () => {
    expect(detector.getAccuracyTarget()).toBeGreaterThanOrEqual(0.95);
  });

  it('should have low false positive threshold', () => {
    expect(detector.getFalsePositiveThreshold()).toBeLessThanOrEqual(0.05);
  });
});

// ============================================================================
// FACT CHECKER TESTS
// ============================================================================

describe('FactChecker', () => {
  let checker: FactChecker;

  beforeEach(() => {
    checker = new FactChecker();
  });

  it('should check facts', async () => {
    const sources = [
      {
        url: 'https://example.com',
        title: 'Source 1',
        content: 'AI is artificial intelligence',
        reliability: 'high' as const,
      },
    ];

    const result = await checker.factCheck('AI is artificial intelligence', sources);

    expect(result).toBeDefined();
    expect(typeof result.verified).toBe('boolean');
    expect(result.confidence).toBeGreaterThanOrEqual(0);
  });

  it('should search sources', async () => {
    const sources = await checker.searchSources('artificial intelligence', 3);

    expect(sources).toBeDefined();
    expect(sources.length).toBe(3);
  });
});

// ============================================================================
// MODEL MONITORING TESTS
// ============================================================================

describe('ModelMonitoring', () => {
  let monitoring: ModelMonitoring;

  beforeEach(() => {
    monitoring = new ModelMonitoring({
      modelId: 'test-model',
      retentionDays: 30,
    });
  });

  it('should record request', () => {
    monitoring.recordRequest('test-model', {
      latency: 100,
      inputTokens: 50,
      outputTokens: 100,
      cost: 0.01,
      success: true,
    });

    // Should not throw
  });

  it('should get metrics', () => {
    monitoring.recordRequest('test-model', {
      latency: 100,
      inputTokens: 50,
      outputTokens: 100,
      cost: 0.01,
      success: true,
    });

    const metrics = monitoring.getMetrics('test-model', {
      start: new Date(Date.now() - 3600000),
      end: new Date(),
    });

    expect(metrics).toBeDefined();
    expect(metrics.modelId).toBe('test-model');
  });

  it('should generate report', async () => {
    monitoring.recordRequest('test-model', {
      latency: 100,
      inputTokens: 50,
      outputTokens: 100,
      cost: 0.01,
      success: true,
    });

    const report = await monitoring.report('test-model', {
      start: new Date(Date.now() - 3600000),
      end: new Date(),
    });

    expect(report).toBeDefined();
    expect(report.summary).toBeDefined();
  });
});

// ============================================================================
// DRIFT DETECTION TESTS
// ============================================================================

describe('DriftDetection', () => {
  let detection: DriftDetection;

  beforeEach(() => {
    detection = new DriftDetection();
  });

  it('should capture baseline', () => {
    const metrics: any = {
      modelId: 'test-model',
      timeRange: { start: new Date(), end: new Date() },
      latency: { avg: 100, p50: 90, p95: 150, p99: 200, max: 300 },
      quality: { avgAutomatedScore: 0.8, errorRate: 0.05, successRate: 0.95 },
      tokenUsage: { inputTokens: 1000, outputTokens: 2000, totalTokens: 3000, avgInputTokens: 50, avgOutputTokens: 100 },
      cost: { totalCost: 0.5, inputCost: 0.2, outputCost: 0.3, avgCostPerRequest: 0.01 },
      requests: { total: 50, successful: 47, failed: 3, retried: 0 },
    };

    const baseline = detection.captureBaseline('test-model', metrics);

    expect(baseline).toBeDefined();
    expect(baseline.modelId).toBe('test-model');
  });

  it('should detect drift', async () => {
    const metrics: any = {
      modelId: 'test-model',
      timeRange: { start: new Date(), end: new Date() },
      latency: { avg: 100, p50: 90, p95: 150, p99: 200, max: 300 },
      quality: { avgAutomatedScore: 0.8, errorRate: 0.05, successRate: 0.95 },
      tokenUsage: { inputTokens: 1000, outputTokens: 2000, totalTokens: 3000, avgInputTokens: 50, avgOutputTokens: 100 },
      cost: { totalCost: 0.5, inputCost: 0.2, outputCost: 0.3, avgCostPerRequest: 0.01 },
      requests: { total: 50, successful: 47, failed: 3, retried: 0 },
    };

    detection.captureBaseline('test-model', metrics);

    const currentBehavior = {
      modelId: 'test-model',
      metrics,
      patterns: {
        commonInputs: ['test'],
        commonOutputPatterns: ['response'],
        errorPatterns: [],
      },
    };

    const report = await detection.detectDrift('test-model', currentBehavior);

    expect(report).toBeDefined();
    expect(typeof report.isDrifting).toBe('boolean');
  });
});

// ============================================================================
// A/B TESTING TESTS
// ============================================================================

describe('PromptABTesting', () => {
  let abTesting: PromptABTesting;

  beforeEach(() => {
    abTesting = new PromptABTesting();
  });

  it('should create test', async () => {
    const promptA: any = { id: 'a', name: 'Prompt A', template: 'A', version: '1.0.0' };
    const promptB: any = { id: 'b', name: 'Prompt B', template: 'B', version: '1.0.0' };

    const test = await abTesting.createTest('Test', 'Description', promptA, promptB);

    expect(test).toBeDefined();
    expect(test.id).toBeDefined();
    expect(test.status).toBe('draft');
  });

  it('should start test', async () => {
    const promptA: any = { id: 'a', name: 'A', template: 'A', version: '1.0.0' };
    const promptB: any = { id: 'b', name: 'B', template: 'B', version: '1.0.0' };

    const test = await abTesting.createTest('Test', 'Desc', promptA, promptB);
    await abTesting.startTest(test.id);

    const updated = abTesting.getTest(test.id);

    expect(updated?.status).toBe('running');
  });

  it('should analyze results', async () => {
    const promptA: any = { id: 'a', name: 'A', template: 'A', version: '1.0.0' };
    const promptB: any = { id: 'b', name: 'B', template: 'B', version: '1.0.0' };

    const test = await abTesting.createTest('Test', 'Desc', promptA, promptB);
    await abTesting.startTest(test.id);

    const results = await abTesting.analyze(test.id);

    expect(results).toBeDefined();
    expect(['A', 'B', 'no-difference']).toContain(results.winner);
  });
});

// ============================================================================
// MODEL ROUTER TESTS
// ============================================================================

describe('ModelRouter', () => {
  let router: ModelRouter;

  beforeEach(() => {
    router = new ModelRouter();

    // Register test models
    router.registerModel({
      id: 'fast-model',
      provider: 'openai',
      name: 'Fast Model',
      version: '1.0',
      capabilities: { chat: true, completion: true, embedding: false, fineTuning: false, vision: false, functionCalling: false },
      contextWindow: 4096,
      maxTokens: 2048,
      pricing: { input: 0.001, output: 0.002 },
      averageLatency: 100,
      throughput: 100,
      tags: ['fast'],
      description: 'Fast model',
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    router.registerModel({
      id: 'cheap-model',
      provider: 'openai',
      name: 'Cheap Model',
      version: '1.0',
      capabilities: { chat: true, completion: true, embedding: false, fineTuning: false, vision: false, functionCalling: false },
      contextWindow: 4096,
      maxTokens: 2048,
      pricing: { input: 0.0001, output: 0.0002 },
      averageLatency: 200,
      throughput: 50,
      tags: ['cheap'],
      description: 'Cheap model',
      createdAt: new Date(),
      updatedAt: new Date(),
    });
  });

  it('should route to cheapest model', async () => {
    const decision = await router.route('Test prompt', { priority: 'cost' });

    expect(decision).toBeDefined();
    expect(decision.selectedModel).toBe('cheap-model');
  });

  it('should route to fastest model', async () => {
    const decision = await router.route('Test prompt', { priority: 'latency' });

    expect(decision).toBeDefined();
    expect(decision.selectedModel).toBe('fast-model');
  });

  it('should provide alternatives', async () => {
    const decision = await router.route('Test prompt', { priority: 'cost' });

    expect(decision.alternatives).toBeDefined();
    expect(Array.isArray(decision.alternatives)).toBe(true);
  });
});

// ============================================================================
// MODEL REGISTRY TESTS
// ============================================================================

describe('ModelRegistry', () => {
  let registry: ModelRegistry;

  beforeEach(() => {
    registry = new ModelRegistry();
  });

  it('should initialize with default models', () => {
    const models = registry.list();

    expect(models.length).toBeGreaterThan(0);
  });

  it('should get model by ID', () => {
    const model = registry.get('gpt-4');

    expect(model).toBeDefined();
    expect(model?.name).toBe('GPT-4');
  });

  it('should list models by provider', () => {
    const openaiModels = registry.listByProvider('openai');

    expect(openaiModels.length).toBeGreaterThan(0);
    expect(openaiModels.every((m) => m.provider === 'openai')).toBe(true);
  });

  it('should search models', () => {
    const results = registry.search({
      tags: ['production'],
    });

    expect(results.length).toBeGreaterThan(0);
  });

  it('should get statistics', () => {
    const stats = registry.getStats();

    expect(stats).toBeDefined();
    expect(stats.total).toBeGreaterThan(0);
    expect(stats.byProvider).toBeDefined();
  });
});

describe('LLMOps Integration', () => {
  it('should complete end-to-end fine-tuning workflow', async () => {
    // Prepare dataset
    const preparer = new DatasetPreparer();
    const examples = Array.from({ length: 15 }, (_, i) => ({
      prompt: `Test ${i}`,
      completion: `Response ${i}`,
    }));
    const dataset = await preparer.prepareDataset(examples, { format: 'jsonl' });

    // Start fine-tuning
    const pipeline = new FineTuningPipeline({
      provider: 'openai',
      apiKey: 'test-key',
    });

    const job = await pipeline.fineTune({
      baseModel: 'gpt-3.5-turbo',
      modelName: 'test-model',
      datasetId: dataset.id,
      hyperparameters: { epochs: 1 },
      method: 'full',
    });

    expect(job).toBeDefined();
    expect(job.id).toBeDefined();
  });

  it('should complete end-to-end prompt testing workflow', async () => {
    // Create prompt
    const registry = new PromptRegistry();
    const prompt = await registry.create({
      name: 'Test Prompt',
      description: 'Test',
      template: 'Hello {{name}}',
      variables: [{ name: 'name', type: 'string', description: 'Name', required: true }],
      examples: [],
      modelConfig: { model: 'gpt-3.5-turbo', temperature: 0.7, maxTokens: 100 },
      tags: [],
      author: 'test',
      status: 'active',
    });

    // Create test suite
    const testing = new PromptTesting();
    const suite = await testing.createTestSuite('Test Suite', prompt.id, [
      {
        id: 'test-1',
        name: 'Test 1',
        variables: { name: 'World' },
        expectedOutput: 'Hello World',
      },
    ]);

    // Run tests
    const run = await testing.runTests(suite.id, prompt);

    expect(run).toBeDefined();
    expect(run.summary.total).toBe(1);
  });
});
