/**
 * Prediction Service
 * Time series forecasting and predictive analytics
 */

import * as tf from '@tensorflow/tfjs-node';
import { ARIMA } from 'arima';
import { EventEmitter } from 'events';
import * as stats from 'simple-statistics';

export interface TimeSeriesData {
  timestamp: Date;
  value: number;
  metadata?: Record<string, unknown>;
}

export interface PredictionModel {
  model: tf.LayersModel | unknown;
  type: string;
  trained: boolean;
  lastUpdated?: Date;
}

export interface AnomalyDetectionResult {
  timestamp: Date;
  value: number;
  isAnomaly: boolean;
  score: number;
  threshold: number;
}

export interface TrendAnalysis {
  trend: 'increasing' | 'decreasing' | 'stable';
  strength: number;
  changePoints: Date[];
  seasonality?: {
    detected: boolean;
    period?: number;
    strength?: number;
  };
}

export interface IsolationTree {
  type: 'leaf' | 'internal';
  size?: number;
  splitValue?: number;
  left?: IsolationTree;
  right?: IsolationTree;
}

export interface PredictionRequest {
  data: TimeSeriesData[];
  horizon: number;
  method?: 'arima' | 'lstm' | 'prophet' | 'exponential' | 'ensemble';
  seasonality?: {
    period: number;
    type: 'additive' | 'multiplicative';
  };
  externalFactors?: Record<string, number[]>;
  confidence?: number;
}

export interface Forecast {
  timestamp: Date;
  value: number;
  lower: number;
  upper: number;
  confidence: number;
}

export class PredictionService extends EventEmitter {
  private models: Map<string, PredictionModel> = new Map();
  private lstmModel: tf.LayersModel | null = null;
  
  constructor() {
    super();
    this.initialize();
  }
  
  private async initialize(): Promise<void> {
    // Build LSTM model for time series
    this.lstmModel = await this.buildLSTMModel();
    console.log('Prediction Service initialized');
  }
  
  private async buildLSTMModel(): Promise<tf.LayersModel> {
    const model = tf.sequential({
      layers: [
        tf.layers.lstm({
          units: 50,
          returnSequences: true,
          inputShape: [10, 1] // lookback window of 10
        }),
        tf.layers.dropout({ rate: 0.2 }),
        tf.layers.lstm({
          units: 50,
          returnSequences: false
        }),
        tf.layers.dropout({ rate: 0.2 }),
        tf.layers.dense({ units: 25, activation: 'relu' }),
        tf.layers.dense({ units: 1 })
      ]
    });
    
    model.compile({
      optimizer: tf.train.adam(0.001),
      loss: 'meanSquaredError',
      metrics: ['mae']
    });
    
    return model;
  }
  
  // Main Prediction Method
  
  public async predict(request: PredictionRequest): Promise<Forecast[]> {
    const method = request.method || 'ensemble';
    
    // Validate and preprocess data
    const processedData = this.preprocessTimeSeries(request.data);
    
    let forecasts: Forecast[];
    
    switch (method) {
      case 'arima':
        forecasts = await this.predictARIMA(processedData, request);
        break;
        
      case 'lstm':
        forecasts = await this.predictLSTM(processedData, request);
        break;
        
      case 'prophet':
        forecasts = await this.predictProphet(processedData, request);
        break;
        
      case 'exponential':
        forecasts = await this.predictExponentialSmoothing(processedData, request);
        break;
        
      case 'ensemble':
        forecasts = await this.predictEnsemble(processedData, request);
        break;
        
      default:
        throw new Error(`Unknown prediction method: ${method}`);
    }
    
    this.emit('prediction:complete', {
      method,
      horizon: request.horizon,
      dataPoints: request.data.length
    });
    
    return forecasts;
  }
  
  // ARIMA Prediction
  
  private async predictARIMA(data: number[], request: PredictionRequest): Promise<Forecast[]> {
    // Auto-detect ARIMA parameters or use defaults
    const autoArima = new ARIMA({
      auto: true,
      verbose: false
    });
    
    // Fit model
    autoArima.train(data);
    const { p, d, q } = autoArima;
    
    console.log(`ARIMA model selected: (${p},${d},${q})`);
    
    // Generate forecasts
    const forecasts = autoArima.predict(request.horizon);
    
    // Calculate prediction intervals
    const mse = this.calculateMSE(data, autoArima);
    const stdError = Math.sqrt(mse);
    
    // Convert to Forecast objects
    const lastTimestamp = request.data[request.data.length - 1].timestamp;
    const interval = this.detectInterval(request.data);
    
    return forecasts.map((value, i) => {
      const timestamp = new Date(lastTimestamp.getTime() + (i + 1) * interval);
      const confidence = request.confidence || 0.95;
      const zScore = this.getZScore(confidence);
      
      return {
        timestamp,
        value,
        lower: value - zScore * stdError * Math.sqrt(i + 1),
        upper: value + zScore * stdError * Math.sqrt(i + 1),
        confidence
      };
    });
  }
  
  // LSTM Prediction
  
  private async predictLSTM(data: number[], request: PredictionRequest): Promise<Forecast[]> {
    if (!this.lstmModel) {
      throw new Error('LSTM model not initialized');
    }
    
    // Normalize data
    const { normalized, min, max } = this.normalizeData(data);
    
    // Prepare sequences
    const lookback = 10;
    const sequences = this.createSequences(normalized, lookback);
    
    if (sequences.length === 0) {
      throw new Error('Insufficient data for LSTM prediction');
    }
    
    // Make predictions
    const forecasts: number[] = [];
    let lastSequence = sequences[sequences.length - 1];
    
    for (let i = 0; i < request.horizon; i++) {
      const input = tf.tensor3d([lastSequence], [1, lookback, 1]);
      const prediction = this.lstmModel.predict(input) as tf.Tensor;
      const value = (await prediction.data())[0];
      
      forecasts.push(value);
      
      // Update sequence for next prediction
      lastSequence = [...lastSequence.slice(1), value];
      
      // Clean up
      input.dispose();
      prediction.dispose();
    }
    
    // Denormalize predictions
    const denormalized = forecasts.map(v => v * (max - min) + min);
    
    // Calculate prediction intervals using historical variance
    const variance = stats.variance(data);
    const stdDev = Math.sqrt(variance);
    
    // Convert to Forecast objects
    const lastTimestamp = request.data[request.data.length - 1].timestamp;
    const interval = this.detectInterval(request.data);
    
    return denormalized.map((value, i) => {
      const timestamp = new Date(lastTimestamp.getTime() + (i + 1) * interval);
      const confidence = request.confidence || 0.95;
      const zScore = this.getZScore(confidence);
      
      // Increase uncertainty over time
      const uncertainty = stdDev * Math.sqrt(1 + i * 0.1);
      
      return {
        timestamp,
        value,
        lower: value - zScore * uncertainty,
        upper: value + zScore * uncertainty,
        confidence
      };
    });
  }
  
  // Prophet-style Prediction
  
  private async predictProphet(data: number[], request: PredictionRequest): Promise<Forecast[]> {
    // Decompose time series
    const decomposition = this.decomposeTimeSeries(data, request.seasonality);
    
    // Fit trend
    const trendModel = this.fitTrend(decomposition.trend);
    
    // Fit seasonality
    const seasonalModel = this.fitSeasonality(decomposition.seasonal, request.seasonality);
    
    // Generate forecasts
    const forecasts: Forecast[] = [];
    const lastTimestamp = request.data[request.data.length - 1].timestamp;
    const interval = this.detectInterval(request.data);
    
    for (let i = 0; i < request.horizon; i++) {
      const timestamp = new Date(lastTimestamp.getTime() + (i + 1) * interval);
      const t = data.length + i;
      
      // Predict components
      const trend = this.predictTrend(trendModel, t);
      const seasonal = this.predictSeasonality(seasonalModel, t, request.seasonality);
      
      const value = trend + seasonal + decomposition.residualMean;
      
      // Calculate uncertainty
      const uncertainty = decomposition.residualStd * Math.sqrt(1 + i * 0.05);
      const confidence = request.confidence || 0.95;
      const zScore = this.getZScore(confidence);
      
      forecasts.push({
        timestamp,
        value,
        lower: value - zScore * uncertainty,
        upper: value + zScore * uncertainty,
        confidence
      });
    }
    
    return forecasts;
  }
  
  // Exponential Smoothing
  
  private async predictExponentialSmoothing(data: number[], request: PredictionRequest): Promise<Forecast[]> {
    // Determine smoothing parameters
    const alpha = this.optimizeAlpha(data);
    const beta = request.seasonality ? this.optimizeBeta(data) : 0;
    const gamma = request.seasonality ? this.optimizeGamma(data) : 0;
    
    // Apply Holt-Winters if seasonal
    let forecasts: number[];
    if (request.seasonality) {
      forecasts = this.holtWinters(data, request.horizon, alpha, beta, gamma, request.seasonality);
    } else {
      forecasts = this.doubleExponentialSmoothing(data, request.horizon, alpha, beta);
    }
    
    // Calculate prediction intervals
    const residuals = this.calculateResiduals(data, forecasts.slice(0, data.length));
    const rmse = Math.sqrt(stats.mean(residuals.map(r => r * r)));
    
    // Convert to Forecast objects
    const lastTimestamp = request.data[request.data.length - 1].timestamp;
    const interval = this.detectInterval(request.data);
    
    return forecasts.slice(data.length).map((value, i) => {
      const timestamp = new Date(lastTimestamp.getTime() + (i + 1) * interval);
      const confidence = request.confidence || 0.95;
      const zScore = this.getZScore(confidence);
      
      return {
        timestamp,
        value,
        lower: value - zScore * rmse * Math.sqrt(i + 1),
        upper: value + zScore * rmse * Math.sqrt(i + 1),
        confidence
      };
    });
  }
  
  // Ensemble Prediction
  
  private async predictEnsemble(data: number[], request: PredictionRequest): Promise<Forecast[]> {
    // Run multiple models
    const [arima, lstm, exponential] = await Promise.all([
      this.predictARIMA(data, request),
      this.predictLSTM(data, request),
      this.predictExponentialSmoothing(data, request)
    ]);
    
    // Combine forecasts
    const ensembleForecasts: Forecast[] = [];
    
    for (let i = 0; i < request.horizon; i++) {
      // Weighted average
      const weights = { arima: 0.4, lstm: 0.4, exponential: 0.2 };
      
      const value = 
        arima[i].value * weights.arima +
        lstm[i].value * weights.lstm +
        exponential[i].value * weights.exponential;
      
      // Combine prediction intervals
      const lower = Math.min(arima[i].lower, lstm[i].lower, exponential[i].lower);
      const upper = Math.max(arima[i].upper, lstm[i].upper, exponential[i].upper);
      
      ensembleForecasts.push({
        timestamp: arima[i].timestamp,
        value,
        lower,
        upper,
        confidence: request.confidence || 0.95
      });
    }
    
    return ensembleForecasts;
  }
  
  // Anomaly Detection
  
  public async detectAnomalies(data: TimeSeriesData[], options?: {
    method?: 'statistical' | 'isolation' | 'lstm';
    threshold?: number;
    windowSize?: number;
  }): Promise<Array<{timestamp: Date, value: number, score: number, isAnomaly: boolean}>> {
    const method = options?.method || 'statistical';
    const values = data.map(d => d.value);
    
    let anomalyScores: number[];
    
    switch (method) {
      case 'statistical':
        anomalyScores = this.statisticalAnomalyDetection(values, options);
        break;
        
      case 'isolation':
        anomalyScores = await this.isolationForestDetection(values, options);
        break;
        
      case 'lstm':
        anomalyScores = await this.lstmAnomalyDetection(values, options);
        break;
        
      default:
        throw new Error(`Unknown anomaly detection method: ${method}`);
    }
    
    const threshold = options?.threshold || 0.95;
    
    return data.map((d, i) => ({
      timestamp: d.timestamp,
      value: d.value,
      score: anomalyScores[i],
      isAnomaly: anomalyScores[i] > threshold
    }));
  }
  
  private statisticalAnomalyDetection(data: number[], options?: Record<string, unknown>): number[] {
    const windowSize = (options?.windowSize as number) || 20;
    const scores: number[] = [];
    
    for (let i = 0; i < data.length; i++) {
      if (i < windowSize) {
        scores.push(0);
        continue;
      }
      
      const window = data.slice(Math.max(0, i - windowSize), i);
      const mean = stats.mean(window);
      const stdDev = stats.standardDeviation(window);
      
      const zScore = Math.abs((data[i] - mean) / stdDev);
      const score = 1 - 2 * stats.cumulativeStdNormalProbability(-Math.abs(zScore));
      
      scores.push(score);
    }
    
    return scores;
  }
  
  private async isolationForestDetection(
    data: number[],
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    options?: Record<string, unknown>
  ): Promise<number[]> {
    // Simplified isolation forest
    const numTrees = 100;
    const sampleSize = Math.min(256, data.length);
    
    const trees: Record<string, unknown>[] = [];
    for (let i = 0; i < numTrees; i++) {
      const sample = this.randomSample(data, sampleSize);
      trees.push(this.buildIsolationTree(sample));
    }
    
    // Calculate anomaly scores
    const scores = data.map(value => {
      const pathLengths = trees.map(tree => this.getPathLength(tree, value));
      const avgPathLength = stats.mean(pathLengths);
      const expectedPathLength = 2 * Math.log(sampleSize - 1) + 0.5772;
      
      return Math.pow(2, -avgPathLength / expectedPathLength);
    });
    
    return scores;
  }
  
  private async lstmAnomalyDetection(
    data: number[],
    options?: Record<string, unknown>
  ): Promise<number[]> {
    if (!this.lstmModel) {
      return this.statisticalAnomalyDetection(data, options);
    }
    
    const { normalized } = this.normalizeData(data);
    const lookback = 10;
    const sequences = this.createSequences(normalized, lookback);
    
    const scores: number[] = Array(lookback).fill(0);
    
    for (let i = 0; i < sequences.length; i++) {
      const input = tf.tensor3d([sequences[i].slice(0, -1)], [1, lookback - 1, 1]);
      const prediction = this.lstmModel.predict(input) as tf.Tensor;
      const predicted = (await prediction.data())[0];
      const actual = sequences[i][sequences[i].length - 1];
      
      const error = Math.abs(predicted - actual);
      scores.push(error);
      
      input.dispose();
      prediction.dispose();
    }
    
    // Normalize scores to [0, 1]
    const maxScore = Math.max(...scores);
    return scores.map(s => s / maxScore);
  }
  
  // Change Point Detection
  
  public async detectChangePoints(data: TimeSeriesData[], options?: {
    method?: 'cusum' | 'pelt' | 'binary';
    minSegmentLength?: number;
    penalty?: number;
  }): Promise<number[]> {
    const values = data.map(d => d.value);
    const method = options?.method || 'pelt';
    
    switch (method) {
      case 'cusum':
        return this.cusumChangeDetection(values, options);
        
      case 'pelt':
        return this.peltChangeDetection(values, options);
        
      case 'binary':
        return this.binarySegmentation(values, options);
        
      default:
        throw new Error(`Unknown change point detection method: ${method}`);
    }
  }
  
  private cusumChangeDetection(data: number[], options?: Record<string, unknown>): number[] {
    const threshold = options?.threshold || 5;
    const changePoints: number[] = [];
    
    const mean = stats.mean(data);
    const stdDev = stats.standardDeviation(data);
    
    let cusumPos = 0;
    let cusumNeg = 0;
    
    for (let i = 0; i < data.length; i++) {
      const z = (data[i] - mean) / stdDev;
      
      cusumPos = Math.max(0, cusumPos + z - 0.5);
      cusumNeg = Math.max(0, cusumNeg - z - 0.5);
      
      if (cusumPos > threshold || cusumNeg > threshold) {
        changePoints.push(i);
        cusumPos = 0;
        cusumNeg = 0;
      }
    }
    
    return changePoints;
  }
  
  private peltChangeDetection(data: number[], options?: Record<string, unknown>): number[] {
    // Simplified PELT algorithm
    const minSegmentLength = options?.minSegmentLength || 5;
    const penalty = options?.penalty || Math.log(data.length);
    
    const n = data.length;
    const cost = Array(n + 1).fill(Infinity);
    const changePoints = Array(n + 1).fill(-1);
    
    cost[0] = -penalty;
    
    for (let t = minSegmentLength; t <= n; t++) {
      for (let s = 0; s <= t - minSegmentLength; s++) {
        const segmentCost = this.calculateSegmentCost(data.slice(s, t));
        const totalCost = cost[s] + segmentCost + penalty;
        
        if (totalCost < cost[t]) {
          cost[t] = totalCost;
          changePoints[t] = s;
        }
      }
    }
    
    // Backtrack to find change points
    const result: number[] = [];
    let t = n;
    while (t > 0) {
      const cp = changePoints[t];
      if (cp > 0) {
        result.unshift(cp);
      }
      t = cp;
    }
    
    return result;
  }
  
  private binarySegmentation(data: number[], options?: Record<string, unknown>): number[] {
    const minSegmentLength = options?.minSegmentLength || 10;
    const maxChangePoints = options?.maxChangePoints || 10;
    
    const changePoints: number[] = [];
    const segments: Array<[number, number]> = [[0, data.length]];
    
    while (segments.length > 0 && changePoints.length < maxChangePoints) {
      let bestGain = 0;
      let bestSegmentIndex = -1;
      let bestSplitPoint = -1;
      
      for (let i = 0; i < segments.length; i++) {
        const [start, end] = segments[i];
        if (end - start < 2 * minSegmentLength) continue;
        
        for (let split = start + minSegmentLength; split < end - minSegmentLength; split++) {
          const gain = this.calculateSplitGain(data, start, split, end);
          
          if (gain > bestGain) {
            bestGain = gain;
            bestSegmentIndex = i;
            bestSplitPoint = split;
          }
        }
      }
      
      if (bestSegmentIndex === -1) break;
      
      changePoints.push(bestSplitPoint);
      const [start, end] = segments[bestSegmentIndex];
      segments.splice(bestSegmentIndex, 1, [start, bestSplitPoint], [bestSplitPoint, end]);
    }
    
    return changePoints.sort((a, b) => a - b);
  }
  
  // Helper Methods
  
  private preprocessTimeSeries(data: TimeSeriesData[]): number[] {
    // Sort by timestamp
    const sorted = [...data].sort((a, b) => a.timestamp.getTime() - b.timestamp.getTime());
    
    // Handle missing values
    const values = sorted.map(d => d.value);
    return this.fillMissingValues(values);
  }
  
  private fillMissingValues(data: number[]): number[] {
    const filled = [...data];
    
    for (let i = 0; i < filled.length; i++) {
      if (isNaN(filled[i]) || filled[i] === null || filled[i] === undefined) {
        // Linear interpolation
        let prev = i - 1;
        let next = i + 1;
        
        while (prev >= 0 && (isNaN(filled[prev]) || filled[prev] === null)) prev--;
        while (next < filled.length && (isNaN(filled[next]) || filled[next] === null)) next++;
        
        if (prev >= 0 && next < filled.length) {
          filled[i] = filled[prev] + (filled[next] - filled[prev]) * ((i - prev) / (next - prev));
        } else if (prev >= 0) {
          filled[i] = filled[prev];
        } else if (next < filled.length) {
          filled[i] = filled[next];
        } else {
          filled[i] = 0;
        }
      }
    }
    
    return filled;
  }
  
  private detectInterval(data: TimeSeriesData[]): number {
    if (data.length < 2) return 86400000; // Default to 1 day
    
    const intervals = [];
    for (let i = 1; i < Math.min(data.length, 10); i++) {
      intervals.push(data[i].timestamp.getTime() - data[i-1].timestamp.getTime());
    }
    
    return stats.median(intervals);
  }
  
  private normalizeData(data: number[]): { normalized: number[], min: number, max: number } {
    const min = Math.min(...data);
    const max = Math.max(...data);
    const range = max - min || 1;
    
    return {
      normalized: data.map(v => (v - min) / range),
      min,
      max
    };
  }
  
  private createSequences(data: number[], lookback: number): number[][] {
    const sequences: number[][] = [];
    
    for (let i = lookback; i < data.length; i++) {
      sequences.push(data.slice(i - lookback, i + 1));
    }
    
    return sequences;
  }
  
  private calculateMSE(actual: number[], model: ARIMA): number {
    // Calculate mean squared error for ARIMA model
    const predictions = model.predict(actual.length);
    const errors = actual.map((val, i) => val - predictions[i]);
    return stats.mean(errors.map(e => e * e));
  }
  
  private getZScore(confidence: number): number {
    // Get z-score for confidence interval
    const zScores: Record<number, number> = {
      0.90: 1.645,
      0.95: 1.96,
      0.99: 2.576
    };
    
    return zScores[confidence] || 1.96;
  }
  
  private decomposeTimeSeries(data: number[], seasonality?: {
    period: number;
    type: 'additive' | 'multiplicative';
  }): {
    trend: number[];
    seasonal: number[];
    residuals: number[];
    residualMean: number;
    residualStd: number;
  } {
    const period = seasonality?.period || 7;
    
    // Simple moving average for trend
    const trend = this.movingAverage(data, period);
    
    // Detrended series
    const detrended = data.map((v, i) => v - trend[i]);
    
    // Seasonal component
    const seasonal = this.extractSeasonality(detrended, period);
    
    // Residuals
    const residuals = data.map((v, i) => v - trend[i] - seasonal[i % period]);
    
    return {
      trend,
      seasonal,
      residuals,
      residualMean: stats.mean(residuals),
      residualStd: stats.standardDeviation(residuals)
    };
  }
  
  private movingAverage(data: number[], window: number): number[] {
    const result: number[] = [];
    
    for (let i = 0; i < data.length; i++) {
      const start = Math.max(0, i - Math.floor(window / 2));
      const end = Math.min(data.length, i + Math.ceil(window / 2));
      const windowData = data.slice(start, end);
      result.push(stats.mean(windowData));
    }
    
    return result;
  }
  
  private extractSeasonality(data: number[], period: number): number[] {
    const seasonal = Array(period).fill(0);
    const counts = Array(period).fill(0);
    
    for (let i = 0; i < data.length; i++) {
      seasonal[i % period] += data[i];
      counts[i % period]++;
    }
    
    return seasonal.map((sum, i) => sum / counts[i]);
  }
  
  private fitTrend(trend: number[]): {
    slope: number;
    intercept: number;
  } {
    // Simple linear regression
    const x = trend.map((_, i) => i);
    const regression = stats.linearRegression([x, trend]);
    
    return {
      slope: regression.m,
      intercept: regression.b
    };
  }
  
  private predictTrend(model: { slope: number; intercept: number }, t: number): number {
    return model.slope * t + model.intercept;
  }
  
  private fitSeasonality(
    seasonal: number[],
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    seasonality?: {
      period: number;
      type: 'additive' | 'multiplicative';
    }
  ): { values: number[] } {
    return { values: seasonal };
  }
  
  private predictSeasonality(
    model: { values: number[] },
    t: number,
    seasonality?: {
      period: number;
      type: 'additive' | 'multiplicative';
    }
  ): number {
    const period = seasonality?.period || model.values.length;
    return model.values[t % period];
  }
  
  private optimizeAlpha(data: number[]): number {
    // Grid search for optimal alpha
    let bestAlpha = 0.3;
    let bestError = Infinity;
    
    for (let alpha = 0.1; alpha <= 0.9; alpha += 0.1) {
      const predictions = this.simpleExponentialSmoothing(data, alpha);
      const error = this.calculateRMSE(data.slice(1), predictions.slice(0, -1));
      
      if (error < bestError) {
        bestError = error;
        bestAlpha = alpha;
      }
    }
    
    return bestAlpha;
  }
  
  private optimizeBeta(
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    data: number[]
  ): number {
    return 0.1; // Simplified
  }
  
  private optimizeGamma(
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    data: number[]
  ): number {
    return 0.1; // Simplified
  }
  
  private simpleExponentialSmoothing(data: number[], alpha: number): number[] {
    const result: number[] = [data[0]];
    
    for (let i = 1; i < data.length; i++) {
      result.push(alpha * data[i] + (1 - alpha) * result[i - 1]);
    }
    
    return result;
  }
  
  private doubleExponentialSmoothing(data: number[], horizon: number, alpha: number, beta: number): number[] {
    const n = data.length;
    const s: number[] = [data[0]];
    const b: number[] = [data[1] - data[0]];
    
    // Fit model
    for (let i = 1; i < n; i++) {
      s[i] = alpha * data[i] + (1 - alpha) * (s[i - 1] + b[i - 1]);
      b[i] = beta * (s[i] - s[i - 1]) + (1 - beta) * b[i - 1];
    }
    
    // Forecast
    const forecasts: number[] = [...data];
    for (let i = 0; i < horizon; i++) {
      forecasts.push(s[n - 1] + (i + 1) * b[n - 1]);
    }
    
    return forecasts;
  }
  
  private holtWinters(
    data: number[],
    horizon: number,
    alpha: number,
    beta: number,
    gamma: number,
    seasonality: {
      period: number;
      type: 'additive' | 'multiplicative';
    }
  ): number[] {
    const period = seasonality.period;
    const n = data.length;
    
    // Initialize
    const s: number[] = [stats.mean(data.slice(0, period))];
    const b: number[] = [(data[period] - data[0]) / period];
    const seasonal: number[] = data.slice(0, period).map(v => v - s[0]);
    
    // Fit model
    for (let i = period; i < n; i++) {
      const prevS = s[s.length - 1];
      const prevB = b[b.length - 1];
      const prevSeasonal = seasonal[i % period];
      
      s.push(alpha * (data[i] - prevSeasonal) + (1 - alpha) * (prevS + prevB));
      b.push(beta * (s[s.length - 1] - prevS) + (1 - beta) * prevB);
      seasonal[i % period] = gamma * (data[i] - s[s.length - 1]) + (1 - gamma) * prevSeasonal;
    }
    
    // Forecast
    const forecasts: number[] = [...data];
    for (let i = 0; i < horizon; i++) {
      const trend = s[s.length - 1] + (i + 1) * b[b.length - 1];
      const seasonalComponent = seasonal[(n + i) % period];
      forecasts.push(trend + seasonalComponent);
    }
    
    return forecasts;
  }
  
  private calculateResiduals(actual: number[], predicted: number[]): number[] {
    return actual.map((val, i) => val - predicted[i]);
  }
  
  private calculateRMSE(actual: number[], predicted: number[]): number {
    const errors = actual.map((val, i) => val - predicted[i]);
    return Math.sqrt(stats.mean(errors.map(e => e * e)));
  }
  
  private randomSample<T>(array: T[], size: number): T[] {
    const sample: T[] = [];
    const indices = new Set<number>();
    
    while (indices.size < size) {
      indices.add(Math.floor(Math.random() * array.length));
    }
    
    indices.forEach(i => sample.push(array[i]));
    return sample;
  }
  
  private buildIsolationTree(data: number[], depth: number = 0, maxDepth: number = 10): IsolationTree {
    if (data.length <= 1 || depth >= maxDepth) {
      return { type: 'leaf', size: data.length };
    }
    
    const min = Math.min(...data);
    const max = Math.max(...data);
    
    if (min === max) {
      return { type: 'leaf', size: data.length };
    }
    
    const splitValue = min + Math.random() * (max - min);
    const left = data.filter(v => v < splitValue);
    const right = data.filter(v => v >= splitValue);
    
    return {
      type: 'internal',
      splitValue,
      left: this.buildIsolationTree(left, depth + 1, maxDepth),
      right: this.buildIsolationTree(right, depth + 1, maxDepth)
    };
  }
  
  private getPathLength(
    tree: IsolationTree,
    value: number,
    depth: number = 0
  ): number {
    if (tree.type === 'leaf') {
      return depth + (tree.size > 1 ? 2 * Math.log(tree.size - 1) + 0.5772 : 0);
    }
    
    if (value < tree.splitValue) {
      return this.getPathLength(tree.left, value, depth + 1);
    } else {
      return this.getPathLength(tree.right, value, depth + 1);
    }
  }
  
  private calculateSegmentCost(segment: number[]): number {
    if (segment.length === 0) return 0;
    
    const mean = stats.mean(segment);
    const variance = stats.variance(segment);
    
    // Negative log-likelihood for Gaussian distribution
    return segment.length * Math.log(2 * Math.PI * variance) / 2 +
           segment.reduce((sum, val) => sum + Math.pow(val - mean, 2), 0) / (2 * variance);
  }
  
  private calculateSplitGain(data: number[], start: number, split: number, end: number): number {
    const totalCost = this.calculateSegmentCost(data.slice(start, end));
    const leftCost = this.calculateSegmentCost(data.slice(start, split));
    const rightCost = this.calculateSegmentCost(data.slice(split, end));
    
    return totalCost - leftCost - rightCost;
  }
}