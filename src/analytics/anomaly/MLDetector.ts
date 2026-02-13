/**
 * Machine Learning-based Anomaly Detection
 *
 * Implements Isolation Forest algorithm for multivariate anomaly detection.
 * Isolation Forest works by randomly partitioning the data space and
 * detecting anomalies as points that are isolated with fewer partitions.
 *
 * @module anomaly/MLDetector
 */

import { logger } from '../../services/SimpleLogger';

/**
 * Individual Isolation Tree for the Isolation Forest
 */
class IsolationTree {
  private splitFeature: number | null = null;
  private splitValue: number | null = null;
  private left: IsolationTree | null = null;
  private right: IsolationTree | null = null;
  private size: number;

  constructor(data: number[][], currentHeight: number, maxHeight: number) {
    this.size = data.length;

    // Termination conditions
    if (currentHeight >= maxHeight || data.length <= 1) {
      return;
    }

    // Randomly select feature and split value
    const numFeatures = data[0].length;
    this.splitFeature = Math.floor(Math.random() * numFeatures);

    const featureValues = data.map((d) => d[this.splitFeature!]);
    const min = Math.min(...featureValues);
    const max = Math.max(...featureValues);

    if (min === max) {
      return;
    }

    this.splitValue = min + Math.random() * (max - min);

    // Split data
    const leftData = data.filter((d) => d[this.splitFeature!] < this.splitValue!);
    const rightData = data.filter((d) => d[this.splitFeature!] >= this.splitValue!);

    if (leftData.length > 0) {
      this.left = new IsolationTree(leftData, currentHeight + 1, maxHeight);
    }
    if (rightData.length > 0) {
      this.right = new IsolationTree(rightData, currentHeight + 1, maxHeight);
    }
  }

  /**
   * Calculate path length for a point
   */
  pathLength(point: number[], currentHeight: number): number {
    // External node
    if (this.splitFeature === null || this.splitValue === null) {
      return currentHeight + this.averagePathLength(this.size);
    }

    // Internal node
    if (point[this.splitFeature] < this.splitValue) {
      return this.left
        ? this.left.pathLength(point, currentHeight + 1)
        : currentHeight + 1 + this.averagePathLength(this.size);
    } else {
      return this.right
        ? this.right.pathLength(point, currentHeight + 1)
        : currentHeight + 1 + this.averagePathLength(this.size);
    }
  }

  /**
   * Calculate expected average path length for a subtree of size n
   * Based on binary search tree average path length formula
   */
  private averagePathLength(n: number): number {
    if (n <= 1) return 0;
    return 2 * (Math.log(n - 1) + 0.5772156649) - (2 * (n - 1)) / n;
  }
}

/**
 * Isolation Forest Detector
 *
 * Ensemble of Isolation Trees for robust anomaly detection.
 * Anomaly score is based on average path length across all trees.
 */
export class IsolationForestDetector {
  private trees: IsolationTree[] = [];
  private numTrees: number;
  private sampleSize: number;
  private trained = false;

  constructor(numTrees = 100, sampleSize = 256) {
    this.numTrees = numTrees;
    this.sampleSize = sampleSize;
  }

  /**
   * Train the Isolation Forest on provided data
   */
  train(data: number[][]): void {
    if (data.length === 0 || data[0].length === 0) {
      throw new Error('Cannot train on empty data');
    }

    logger.debug(`Training Isolation Forest with ${data.length} samples...`);

    this.trees = [];
    const maxHeight = Math.ceil(Math.log2(this.sampleSize));

    for (let i = 0; i < this.numTrees; i++) {
      // Sample data with replacement
      const sample: number[][] = [];
      for (let j = 0; j < Math.min(this.sampleSize, data.length); j++) {
        const randomIndex = Math.floor(Math.random() * data.length);
        sample.push(data[randomIndex]);
      }

      // Build tree
      this.trees.push(new IsolationTree(sample, 0, maxHeight));
    }

    this.trained = true;
    logger.debug('Isolation Forest trained successfully');
  }

  /**
   * Predict anomaly score for a single point
   * Returns score between 0 and 1 (higher = more anomalous)
   */
  predict(point: number[]): number {
    if (!this.trained || this.trees.length === 0) {
      throw new Error('Model not trained');
    }

    const avgPathLength =
      this.trees.reduce((sum, tree) => sum + tree.pathLength(point, 0), 0) /
      this.trees.length;

    const expectedPathLength =
      2 * (Math.log(this.sampleSize - 1) + 0.5772156649) -
      (2 * (this.sampleSize - 1)) / this.sampleSize;

    // Anomaly score: 2^(-avgPathLength / expectedPathLength)
    const score = Math.pow(2, -avgPathLength / expectedPathLength);

    return score;
  }

  /**
   * Detect anomalies in batch
   */
  detectAnomalies(data: number[][], threshold = 0.6): boolean[] {
    return data.map((point) => this.predict(point) > threshold);
  }

  /**
   * Get anomaly scores for batch data
   */
  getScores(data: number[][]): number[] {
    return data.map((point) => this.predict(point));
  }

  /**
   * Check if model is trained
   */
  isTrained(): boolean {
    return this.trained;
  }

  /**
   * Get number of trees in the forest
   */
  getTreeCount(): number {
    return this.trees.length;
  }
}
