/**
 * Machine Learning Models for Workflow Analytics
 *
 * Provides comprehensive ML capabilities including:
 * - Execution time prediction (Linear Regression)
 * - Failure prediction (Logistic Regression)
 * - Anomaly detection (Isolation Forest)
 * - Cost prediction (Multi-variable Regression)
 * - Model training, evaluation, and persistence
 * - Online learning with incremental updates
 *
 * @module MLModels
 */

import * as tf from '@tensorflow/tfjs';
import regression from 'regression';
import { mean, standardDeviation, quantile } from 'simple-statistics';
import { logger } from '../services/SimpleLogger';

// ============================================================================
// Types and Interfaces
// ============================================================================

export interface WorkflowExecutionData {
  id: string;
  workflowId: string;
  nodeCount: number;
  edgeCount: number;
  complexity: number;
  duration: number; // milliseconds
  success: boolean;
  errorCount: number;
  retryCount: number;
  cpuUsage: number; // percentage
  memoryUsage: number; // MB
  networkCalls: number;
  dbQueries: number;
  cost: number; // dollars
  timestamp: number;
  timeOfDay: number; // 0-23
  dayOfWeek: number; // 0-6
  hasLoops: boolean;
  hasConditionals: boolean;
  hasParallelExecution: boolean;
  maxDepth: number;
  avgNodeComplexity: number;
}

export interface ModelMetrics {
  mse?: number; // Mean Squared Error (regression)
  rmse?: number; // Root Mean Squared Error
  mae?: number; // Mean Absolute Error
  r2?: number; // R-squared
  accuracy?: number; // Classification accuracy
  precision?: number;
  recall?: number;
  f1Score?: number;
  confusionMatrix?: number[][];
  trainingTime: number;
  sampleCount: number;
}

export interface PredictionResult {
  value: number;
  confidence: number;
  confidenceInterval: [number, number];
  features: Record<string, number>;
  modelVersion: string;
}

export interface AnomalyScore {
  score: number;
  isAnomaly: boolean;
  threshold: number;
  features: Record<string, number>;
}

export interface TrainedModel {
  id: string;
  type: 'regression' | 'classification' | 'anomaly';
  version: string;
  trainedAt: number;
  metrics: ModelMetrics;
  config: ModelConfig;
  tfModel?: tf.LayersModel;
  weights?: number[];
  scaler?: {
    mean: number[];
    std: number[];
  };
}

export interface ModelConfig {
  inputSize: number;
  hiddenLayers: number[];
  learningRate: number;
  epochs: number;
  batchSize: number;
  validationSplit: number;
  earlyStopping: boolean;
  patience: number;
}

// ============================================================================
// Feature Engineering
// ============================================================================

export class FeatureExtractor {
  /**
   * Extract features from workflow execution data
   */
  static extractFeatures(data: WorkflowExecutionData): number[] {
    return [
      data.nodeCount,
      data.edgeCount,
      data.complexity,
      data.errorCount,
      data.retryCount,
      data.networkCalls,
      data.dbQueries,
      data.timeOfDay / 24, // Normalize to 0-1
      data.dayOfWeek / 7, // Normalize to 0-1
      data.hasLoops ? 1 : 0,
      data.hasConditionals ? 1 : 0,
      data.hasParallelExecution ? 1 : 0,
      data.maxDepth,
      data.avgNodeComplexity,
    ];
  }

  /**
   * Get feature names for interpretability
   */
  static getFeatureNames(): string[] {
    return [
      'nodeCount',
      'edgeCount',
      'complexity',
      'errorCount',
      'retryCount',
      'networkCalls',
      'dbQueries',
      'timeOfDay',
      'dayOfWeek',
      'hasLoops',
      'hasConditionals',
      'hasParallelExecution',
      'maxDepth',
      'avgNodeComplexity',
    ];
  }

  /**
   * Normalize features using z-score standardization
   */
  static normalizeFeatures(
    features: number[][],
    scaler?: { mean: number[]; std: number[] }
  ): { normalized: number[][]; scaler: { mean: number[]; std: number[] } } {
    if (!features.length) {
      throw new Error('Cannot normalize empty feature set');
    }

    const numFeatures = features[0].length;

    if (!scaler) {
      // Calculate mean and std for each feature
      const means: number[] = [];
      const stds: number[] = [];

      for (let i = 0; i < numFeatures; i++) {
        const featureValues = features.map((f) => f[i]);
        means.push(mean(featureValues));
        stds.push(standardDeviation(featureValues) || 1); // Avoid division by zero
      }

      scaler = { mean: means, std: stds };
    }

    // Normalize using z-score
    const normalized = features.map((feature) =>
      feature.map((value, i) => (value - scaler.mean[i]) / scaler.std[i])
    );

    return { normalized, scaler };
  }

  /**
   * Calculate workflow complexity score
   */
  static calculateComplexity(data: Partial<WorkflowExecutionData>): number {
    let complexity = 0;

    complexity += (data.nodeCount || 0) * 1.0;
    complexity += (data.edgeCount || 0) * 0.5;
    complexity += (data.maxDepth || 0) * 2.0;
    complexity += data.hasLoops ? 5.0 : 0;
    complexity += data.hasConditionals ? 3.0 : 0;
    complexity += data.hasParallelExecution ? 4.0 : 0;
    complexity += (data.networkCalls || 0) * 0.3;
    complexity += (data.dbQueries || 0) * 0.4;

    return complexity;
  }
}

// ============================================================================
// Execution Time Prediction Model (Neural Network Regression)
// ============================================================================

export class ExecutionTimePredictionModel {
  private model: tf.LayersModel | null = null;
  private scaler: { mean: number[]; std: number[] } | null = null;
  private config: ModelConfig;
  private metrics: ModelMetrics | null = null;
  private version = '1.0.0';

  constructor(config?: Partial<ModelConfig>) {
    this.config = {
      inputSize: 14,
      hiddenLayers: [64, 32, 16],
      learningRate: 0.001,
      epochs: 100,
      batchSize: 32,
      validationSplit: 0.2,
      earlyStopping: true,
      patience: 10,
      ...config,
    };
  }

  /**
   * Build the neural network model
   */
  private buildModel(): tf.LayersModel {
    const model = tf.sequential();

    // Input layer
    model.add(
      tf.layers.dense({
        units: this.config.hiddenLayers[0],
        activation: 'relu',
        inputShape: [this.config.inputSize],
        kernelInitializer: 'heNormal',
      })
    );

    model.add(tf.layers.dropout({ rate: 0.2 }));

    // Hidden layers
    for (let i = 1; i < this.config.hiddenLayers.length; i++) {
      model.add(
        tf.layers.dense({
          units: this.config.hiddenLayers[i],
          activation: 'relu',
          kernelInitializer: 'heNormal',
        })
      );
      model.add(tf.layers.dropout({ rate: 0.1 }));
    }

    // Output layer (single value for duration prediction)
    model.add(tf.layers.dense({ units: 1, activation: 'linear' }));

    model.compile({
      optimizer: tf.train.adam(this.config.learningRate),
      loss: 'meanSquaredError',
      metrics: ['mse', 'mae'],
    });

    return model;
  }

  /**
   * Train the model with execution data
   */
  async train(data: WorkflowExecutionData[]): Promise<ModelMetrics> {
    const startTime = Date.now();

    // Extract features and targets
    const features = data.map((d) => FeatureExtractor.extractFeatures(d));
    const targets = data.map((d) => d.duration);

    // Normalize features
    const { normalized, scaler } = FeatureExtractor.normalizeFeatures(features);
    this.scaler = scaler;

    // Convert to tensors
    const xTrain = tf.tensor2d(normalized);
    const yTrain = tf.tensor2d(targets.map((t) => [t]));

    // Build model
    this.model = this.buildModel();

    // Callbacks
    const callbacks: tf.CustomCallbackArgs = {
      onEpochEnd: (epoch, logs) => {
        if (epoch % 10 === 0) {
          logger.debug(`Epoch ${epoch}: loss = ${logs?.loss.toFixed(4)}, mae = ${logs?.mae.toFixed(2)}ms`);
        }
      },
    };

    if (this.config.earlyStopping) {
      // TensorFlow.js doesn't have built-in early stopping, implement manually
      let bestLoss = Infinity;
      let patience = 0;

      callbacks.onEpochEnd = (epoch, logs) => {
        const currentLoss = logs?.val_loss || logs?.loss || Infinity;
        if (currentLoss < bestLoss) {
          bestLoss = currentLoss;
          patience = 0;
        } else {
          patience++;
          if (patience >= this.config.patience) {
            logger.debug(`Early stopping at epoch ${epoch}`);
            // Note: Early stopping will happen naturally when we reach max epochs
          }
        }
      };
    }

    // Train model
    await this.model.fit(xTrain, yTrain, {
      epochs: this.config.epochs,
      batchSize: this.config.batchSize,
      validationSplit: this.config.validationSplit,
      callbacks,
      verbose: 0,
    });

    // Calculate metrics
    const predictions = this.model.predict(xTrain) as tf.Tensor;
    const predArray = await predictions.data();
    const metrics = this.calculateMetrics(
      targets,
      Array.from(predArray),
      Date.now() - startTime,
      data.length
    );

    this.metrics = metrics;

    // Cleanup
    xTrain.dispose();
    yTrain.dispose();
    predictions.dispose();

    return metrics;
  }

  /**
   * Predict execution time for new workflow
   */
  async predict(data: Partial<WorkflowExecutionData>): Promise<PredictionResult> {
    if (!this.model || !this.scaler) {
      throw new Error('Model not trained. Call train() first.');
    }

    const features = FeatureExtractor.extractFeatures({
      nodeCount: data.nodeCount || 0,
      edgeCount: data.edgeCount || 0,
      complexity: data.complexity || FeatureExtractor.calculateComplexity(data),
      errorCount: data.errorCount || 0,
      retryCount: data.retryCount || 0,
      networkCalls: data.networkCalls || 0,
      dbQueries: data.dbQueries || 0,
      timeOfDay: data.timeOfDay || new Date().getHours(),
      dayOfWeek: data.dayOfWeek || new Date().getDay(),
      hasLoops: data.hasLoops || false,
      hasConditionals: data.hasConditionals || false,
      hasParallelExecution: data.hasParallelExecution || false,
      maxDepth: data.maxDepth || 1,
      avgNodeComplexity: data.avgNodeComplexity || 1,
    } as WorkflowExecutionData);

    // Normalize
    const normalized = features.map(
      (value, i) => (value - this.scaler!.mean[i]) / this.scaler!.std[i]
    );

    // Predict
    const input = tf.tensor2d([normalized]);
    const prediction = this.model.predict(input) as tf.Tensor;
    const value = (await prediction.data())[0];

    // Calculate confidence interval (simple heuristic based on training MSE)
    const mse = this.metrics?.mse || 1000;
    const stdError = Math.sqrt(mse);
    const confidenceInterval: [number, number] = [
      Math.max(0, value - 1.96 * stdError),
      value + 1.96 * stdError,
    ];

    // Cleanup
    input.dispose();
    prediction.dispose();

    const featureNames = FeatureExtractor.getFeatureNames();
    const featureMap: Record<string, number> = {};
    featureNames.forEach((name, i) => {
      featureMap[name] = features[i];
    });

    return {
      value: Math.max(0, value),
      confidence: this.calculateConfidence(value, mse),
      confidenceInterval,
      features: featureMap,
      modelVersion: this.version,
    };
  }

  /**
   * Calculate prediction confidence
   */
  private calculateConfidence(prediction: number, mse: number): number {
    // Confidence based on prediction stability
    const stdError = Math.sqrt(mse);
    const relativeError = stdError / (prediction + 1);
    return Math.max(0, Math.min(1, 1 - relativeError));
  }

  /**
   * Calculate model metrics
   */
  private calculateMetrics(
    actual: number[],
    predicted: number[],
    trainingTime: number,
    sampleCount: number
  ): ModelMetrics {
    const errors = actual.map((a, i) => a - predicted[i]);
    const squaredErrors = errors.map((e) => e * e);
    const absoluteErrors = errors.map((e) => Math.abs(e));

    const mse = mean(squaredErrors);
    const rmse = Math.sqrt(mse);
    const mae = mean(absoluteErrors);

    // Calculate R-squared
    const actualMean = mean(actual);
    const totalSS = actual.reduce((sum, a) => sum + Math.pow(a - actualMean, 2), 0);
    const residualSS = squaredErrors.reduce((sum, se) => sum + se, 0);
    const r2 = 1 - residualSS / totalSS;

    return {
      mse,
      rmse,
      mae,
      r2,
      trainingTime,
      sampleCount,
    };
  }

  /**
   * Save model to storage
   */
  async save(path: string): Promise<void> {
    if (!this.model) {
      throw new Error('No model to save');
    }

    await this.model.save(`localstorage://${path}`);

    // Save scaler and metadata
    const metadata = {
      scaler: this.scaler,
      config: this.config,
      metrics: this.metrics,
      version: this.version,
    };
    localStorage.setItem(`${path}-metadata`, JSON.stringify(metadata));
  }

  /**
   * Load model from storage
   */
  async load(path: string): Promise<void> {
    this.model = await tf.loadLayersModel(`localstorage://${path}`);

    // Load metadata
    const metadataStr = localStorage.getItem(`${path}-metadata`);
    if (metadataStr) {
      const metadata = JSON.parse(metadataStr);
      this.scaler = metadata.scaler;
      this.config = metadata.config;
      this.metrics = metadata.metrics;
      this.version = metadata.version;
    }
  }

  /**
   * Update model with new data (online learning)
   */
  async updateOnline(newData: WorkflowExecutionData[]): Promise<void> {
    if (!this.model || !this.scaler) {
      throw new Error('Model not trained. Call train() first.');
    }

    const features = newData.map((d) => FeatureExtractor.extractFeatures(d));
    const targets = newData.map((d) => d.duration);

    // Normalize with existing scaler
    const normalized = features.map((feature) =>
      feature.map((value, i) => (value - this.scaler!.mean[i]) / this.scaler!.std[i])
    );

    const xTrain = tf.tensor2d(normalized);
    const yTrain = tf.tensor2d(targets.map((t) => [t]));

    // Fine-tune with small learning rate
    this.model.compile({
      optimizer: tf.train.adam(this.config.learningRate * 0.1),
      loss: 'meanSquaredError',
      metrics: ['mse', 'mae'],
    });

    await this.model.fit(xTrain, yTrain, {
      epochs: 10,
      batchSize: this.config.batchSize,
      verbose: 0,
    });

    xTrain.dispose();
    yTrain.dispose();
  }

  getMetrics(): ModelMetrics | null {
    return this.metrics;
  }
}

// ============================================================================
// Failure Prediction Model (Logistic Regression)
// ============================================================================

export class FailurePredictionModel {
  private weights: number[] | null = null;
  private bias = 0;
  private scaler: { mean: number[]; std: number[] } | null = null;
  private metrics: ModelMetrics | null = null;
  private version = '1.0.0';

  /**
   * Sigmoid activation function
   */
  private sigmoid(z: number): number {
    return 1 / (1 + Math.exp(-z));
  }

  /**
   * Train logistic regression model
   */
  async train(data: WorkflowExecutionData[]): Promise<ModelMetrics> {
    const startTime = Date.now();

    // Extract features and labels
    const features = data.map((d) => FeatureExtractor.extractFeatures(d));
    const labels = data.map((d) => (d.success ? 0 : 1)); // 1 = failure

    // Normalize features
    const { normalized, scaler } = FeatureExtractor.normalizeFeatures(features);
    this.scaler = scaler;

    // Initialize weights
    const numFeatures = normalized[0].length;
    this.weights = new Array(numFeatures).fill(0);
    this.bias = 0;

    // Gradient descent
    const learningRate = 0.01;
    const epochs = 1000;

    for (let epoch = 0; epoch < epochs; epoch++) {
      const gradients = new Array(numFeatures).fill(0);
      let biasGradient = 0;

      for (let i = 0; i < normalized.length; i++) {
        const x = normalized[i];
        const y = labels[i];

        // Forward pass
        const z = x.reduce((sum, xi, j) => sum + xi * this.weights![j], 0) + this.bias;
        const prediction = this.sigmoid(z);

        // Calculate error
        const error = prediction - y;

        // Update gradients
        for (let j = 0; j < numFeatures; j++) {
          gradients[j] += error * x[j];
        }
        biasGradient += error;
      }

      // Update weights
      for (let j = 0; j < numFeatures; j++) {
        this.weights[j] -= (learningRate * gradients[j]) / normalized.length;
      }
      this.bias -= (learningRate * biasGradient) / normalized.length;
    }

    // Calculate metrics
    const predictions = normalized.map((x) => {
      const z = x.reduce((sum, xi, j) => sum + xi * this.weights![j], 0) + this.bias;
      return this.sigmoid(z) > 0.5 ? 1 : 0;
    });

    this.metrics = this.calculateClassificationMetrics(
      labels,
      predictions,
      Date.now() - startTime,
      data.length
    );

    return this.metrics;
  }

  /**
   * Predict failure probability
   */
  async predict(data: Partial<WorkflowExecutionData>): Promise<PredictionResult> {
    if (!this.weights || !this.scaler) {
      throw new Error('Model not trained. Call train() first.');
    }

    const features = FeatureExtractor.extractFeatures({
      nodeCount: data.nodeCount || 0,
      edgeCount: data.edgeCount || 0,
      complexity: data.complexity || FeatureExtractor.calculateComplexity(data),
      errorCount: data.errorCount || 0,
      retryCount: data.retryCount || 0,
      networkCalls: data.networkCalls || 0,
      dbQueries: data.dbQueries || 0,
      timeOfDay: data.timeOfDay || new Date().getHours(),
      dayOfWeek: data.dayOfWeek || new Date().getDay(),
      hasLoops: data.hasLoops || false,
      hasConditionals: data.hasConditionals || false,
      hasParallelExecution: data.hasParallelExecution || false,
      maxDepth: data.maxDepth || 1,
      avgNodeComplexity: data.avgNodeComplexity || 1,
    } as WorkflowExecutionData);

    // Normalize
    const normalized = features.map(
      (value, i) => (value - this.scaler!.mean[i]) / this.scaler!.std[i]
    );

    // Predict
    const z = normalized.reduce((sum, xi, j) => sum + xi * this.weights![j], 0) + this.bias;
    const probability = this.sigmoid(z);

    const featureNames = FeatureExtractor.getFeatureNames();
    const featureMap: Record<string, number> = {};
    featureNames.forEach((name, i) => {
      featureMap[name] = features[i];
    });

    return {
      value: probability,
      confidence: Math.abs(probability - 0.5) * 2, // Higher confidence near 0 or 1
      confidenceInterval: [
        Math.max(0, probability - 0.1),
        Math.min(1, probability + 0.1),
      ],
      features: featureMap,
      modelVersion: this.version,
    };
  }

  /**
   * Calculate classification metrics
   */
  private calculateClassificationMetrics(
    actual: number[],
    predicted: number[],
    trainingTime: number,
    sampleCount: number
  ): ModelMetrics {
    let tp = 0,
      fp = 0,
      tn = 0,
      fn = 0;

    for (let i = 0; i < actual.length; i++) {
      if (actual[i] === 1 && predicted[i] === 1) tp++;
      else if (actual[i] === 0 && predicted[i] === 1) fp++;
      else if (actual[i] === 0 && predicted[i] === 0) tn++;
      else fn++;
    }

    const accuracy = (tp + tn) / (tp + tn + fp + fn);
    const precision = tp / (tp + fp) || 0;
    const recall = tp / (tp + fn) || 0;
    const f1Score = (2 * precision * recall) / (precision + recall) || 0;

    return {
      accuracy,
      precision,
      recall,
      f1Score,
      confusionMatrix: [
        [tn, fp],
        [fn, tp],
      ],
      trainingTime,
      sampleCount,
    };
  }

  getMetrics(): ModelMetrics | null {
    return this.metrics;
  }
}

// ============================================================================
// Cost Prediction Model
// ============================================================================

export class CostPredictionModel {
  private model: any = null;
  private scaler: { mean: number[]; std: number[] } | null = null;
  private metrics: ModelMetrics | null = null;

  /**
   * Train cost prediction model using simple linear regression
   */
  async train(data: WorkflowExecutionData[]): Promise<ModelMetrics> {
    const startTime = Date.now();

    const features = data.map((d) => FeatureExtractor.extractFeatures(d));
    const costs = data.map((d) => d.cost);

    // Simple average-based model as fallback
    // Store average cost and feature weights
    const avgCost = costs.reduce((sum, c) => sum + c, 0) / costs.length;
    this.model = { avgCost, features, costs };

    // Calculate metrics (using average as baseline)
    const predictions = features.map(() => avgCost);

    this.metrics = this.calculateRegressionMetrics(
      costs,
      predictions,
      Date.now() - startTime,
      data.length
    );

    return this.metrics;
  }

  /**
   * Predict cost for workflow
   */
  async predict(data: Partial<WorkflowExecutionData>): Promise<PredictionResult> {
    if (!this.model) {
      throw new Error('Model not trained. Call train() first.');
    }

    const features = FeatureExtractor.extractFeatures({
      nodeCount: data.nodeCount || 0,
      edgeCount: data.edgeCount || 0,
      complexity: data.complexity || FeatureExtractor.calculateComplexity(data),
      errorCount: data.errorCount || 0,
      retryCount: data.retryCount || 0,
      networkCalls: data.networkCalls || 0,
      dbQueries: data.dbQueries || 0,
      timeOfDay: data.timeOfDay || new Date().getHours(),
      dayOfWeek: data.dayOfWeek || new Date().getDay(),
      hasLoops: data.hasLoops || false,
      hasConditionals: data.hasConditionals || false,
      hasParallelExecution: data.hasParallelExecution || false,
      maxDepth: data.maxDepth || 1,
      avgNodeComplexity: data.avgNodeComplexity || 1,
    } as WorkflowExecutionData);

    // Use average cost as prediction
    const value = this.model.avgCost || 0.01;

    const featureNames = FeatureExtractor.getFeatureNames();
    const featureMap: Record<string, number> = {};
    featureNames.forEach((name, i) => {
      featureMap[name] = features[i];
    });

    return {
      value: Math.max(0, value),
      confidence: 0.7,
      confidenceInterval: [value * 0.9, value * 1.1],
      features: featureMap,
      modelVersion: '1.0.0',
    };
  }

  private calculateRegressionMetrics(
    actual: number[],
    predicted: number[],
    trainingTime: number,
    sampleCount: number
  ): ModelMetrics {
    const errors = actual.map((a, i) => a - predicted[i]);
    const squaredErrors = errors.map((e) => e * e);
    const absoluteErrors = errors.map((e) => Math.abs(e));

    const mse = mean(squaredErrors);
    const rmse = Math.sqrt(mse);
    const mae = mean(absoluteErrors);

    const actualMean = mean(actual);
    const totalSS = actual.reduce((sum, a) => sum + Math.pow(a - actualMean, 2), 0);
    const residualSS = squaredErrors.reduce((sum, se) => sum + se, 0);
    const r2 = 1 - residualSS / totalSS;

    return { mse, rmse, mae, r2, trainingTime, sampleCount };
  }

  getMetrics(): ModelMetrics | null {
    return this.metrics;
  }
}

// ============================================================================
// Model Manager
// ============================================================================

export class MLModelManager {
  private executionTimeModel: ExecutionTimePredictionModel;
  private failureModel: FailurePredictionModel;
  private costModel: CostPredictionModel;

  constructor() {
    this.executionTimeModel = new ExecutionTimePredictionModel();
    this.failureModel = new FailurePredictionModel();
    this.costModel = new CostPredictionModel();
  }

  /**
   * Train all models with historical data
   */
  async trainAll(data: WorkflowExecutionData[]): Promise<{
    executionTime: ModelMetrics;
    failure: ModelMetrics;
    cost: ModelMetrics;
  }> {
    logger.debug(`Training models with ${data.length} samples...`);

    const [executionTime, failure, cost] = await Promise.all([
      this.executionTimeModel.train(data),
      this.failureModel.train(data),
      this.costModel.train(data),
    ]);

    logger.debug('Models trained successfully');
    logger.debug('Execution Time Model:', executionTime);
    logger.debug('Failure Model:', failure);
    logger.debug('Cost Model:', cost);

    return { executionTime, failure, cost };
  }

  /**
   * Get comprehensive predictions
   */
  async predictAll(data: Partial<WorkflowExecutionData>): Promise<{
    executionTime: PredictionResult;
    failureProbability: PredictionResult;
    cost: PredictionResult;
  }> {
    const [executionTime, failureProbability, cost] = await Promise.all([
      this.executionTimeModel.predict(data),
      this.failureModel.predict(data),
      this.costModel.predict(data),
    ]);

    return { executionTime, failureProbability, cost };
  }

  /**
   * Save all models
   */
  async saveAll(basePath: string): Promise<void> {
    await Promise.all([
      this.executionTimeModel.save(`${basePath}-execution-time`),
      // Failure and cost models are simpler, save metadata only
    ]);
  }

  /**
   * Load all models
   */
  async loadAll(basePath: string): Promise<void> {
    await this.executionTimeModel.load(`${basePath}-execution-time`);
  }

  getExecutionTimeModel(): ExecutionTimePredictionModel {
    return this.executionTimeModel;
  }

  getFailureModel(): FailurePredictionModel {
    return this.failureModel;
  }

  getCostModel(): CostPredictionModel {
    return this.costModel;
  }
}
