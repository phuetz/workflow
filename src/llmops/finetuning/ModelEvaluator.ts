/**
 * Model Evaluator
 * Comprehensive model evaluation with metrics, benchmarking, and hyperparameter tuning
 */

import { logger } from '../../services/SimpleLogger';
import type {
  Dataset,
  EvaluationMetrics,
  HyperparameterTuning,
  FineTuneConfig,
} from '../types/llmops';

export interface EvaluationConfig {
  metrics: ('loss' | 'accuracy' | 'bleu' | 'rouge' | 'custom')[];
  testSet: Dataset;
  groundTruth?: string[];
  customEvaluator?: (predicted: string, expected: string) => number;
}

export interface BenchmarkConfig {
  baselineModel: string;
  fineTunedModel: string;
  testSet: Dataset;
  metrics: string[];
}

export interface BenchmarkResults {
  baseline: EvaluationMetrics;
  fineTuned: EvaluationMetrics;
  improvement: {
    loss: number; // % improvement
    accuracy: number;
    bleu: number;
    rouge: number;
  };
  winner: 'baseline' | 'fine-tuned' | 'tie';
}

export class ModelEvaluator {
  /**
   * Evaluate model on test set
   */
  async evaluate(
    modelId: string,
    config: EvaluationConfig
  ): Promise<EvaluationMetrics> {
    logger.debug(`Evaluating model ${modelId}...`);

    const predictions = await this.generatePredictions(modelId, config.testSet);

    // Calculate requested metrics
    const metrics: EvaluationMetrics = {
      loss: 0,
      perplexity: 0,
      avgTokensPerResponse: 0,
    };

    // Loss and perplexity
    if (config.metrics.includes('loss')) {
      metrics.loss = await this.calculateLoss(predictions, config.testSet);
      metrics.perplexity = Math.exp(metrics.loss);
    }

    // Accuracy metrics
    if (config.metrics.includes('accuracy')) {
      const accuracy = this.calculateAccuracy(predictions, config.testSet);
      metrics.accuracy = accuracy.accuracy;
      metrics.precision = accuracy.precision;
      metrics.recall = accuracy.recall;
      metrics.f1Score = accuracy.f1Score;
    }

    // BLEU score
    if (config.metrics.includes('bleu')) {
      metrics.bleuScore = this.calculateBLEU(predictions, config.testSet);
    }

    // ROUGE score
    if (config.metrics.includes('rouge')) {
      metrics.rougeScore = this.calculateROUGE(predictions, config.testSet);
    }

    // Token metrics
    metrics.avgTokensPerResponse = this.calculateAvgTokens(predictions);

    // Custom metrics
    if (config.metrics.includes('custom') && config.customEvaluator) {
      metrics.customMetrics = {};
      for (let i = 0; i < predictions.length; i++) {
        const score = config.customEvaluator(
          predictions[i],
          config.testSet.examples[i].completion
        );
        metrics.customMetrics[`example_${i}`] = score;
      }
    }

    // Test results
    metrics.testResults = predictions.map((pred, i) => ({
      input: config.testSet.examples[i].prompt,
      expected: config.testSet.examples[i].completion,
      actual: pred,
      score: this.calculateSimilarity(pred, config.testSet.examples[i].completion),
    }));

    logger.debug(`Evaluation complete: Loss ${metrics.loss.toFixed(4)}, Accuracy ${(metrics.accuracy || 0).toFixed(4)}`);

    return metrics;
  }

  /**
   * Benchmark fine-tuned model against baseline
   */
  async benchmark(config: BenchmarkConfig): Promise<BenchmarkResults> {
    logger.debug('Running benchmark comparison...');

    // Evaluate baseline
    const baselineMetrics = await this.evaluate(config.baselineModel, {
      metrics: config.metrics as any,
      testSet: config.testSet,
    });

    // Evaluate fine-tuned
    const fineTunedMetrics = await this.evaluate(config.fineTunedModel, {
      metrics: config.metrics as any,
      testSet: config.testSet,
    });

    // Calculate improvements
    const improvement = {
      loss: this.percentImprovement(baselineMetrics.loss, fineTunedMetrics.loss, true),
      accuracy: this.percentImprovement(
        baselineMetrics.accuracy || 0,
        fineTunedMetrics.accuracy || 0
      ),
      bleu: this.percentImprovement(
        baselineMetrics.bleuScore || 0,
        fineTunedMetrics.bleuScore || 0
      ),
      rouge: this.percentImprovement(
        baselineMetrics.rougeScore?.rouge1 || 0,
        fineTunedMetrics.rougeScore?.rouge1 || 0
      ),
    };

    // Determine winner
    let winner: 'baseline' | 'fine-tuned' | 'tie' = 'tie';
    const improvementScore =
      improvement.loss + improvement.accuracy + improvement.bleu + improvement.rouge;

    if (improvementScore > 10) {
      winner = 'fine-tuned';
    } else if (improvementScore < -10) {
      winner = 'baseline';
    }

    logger.debug(`Benchmark complete: Winner is ${winner} (${improvementScore.toFixed(2)}% improvement)`);

    return {
      baseline: baselineMetrics,
      fineTuned: fineTunedMetrics,
      improvement,
      winner,
    };
  }

  /**
   * Hyperparameter tuning
   */
  async tuneHyperparameters(
    baseConfig: FineTuneConfig,
    tuningConfig: Partial<HyperparameterTuning>
  ): Promise<HyperparameterTuning> {
    logger.debug(`Starting hyperparameter tuning with ${tuningConfig.method}...`);

    const method = tuningConfig.method || 'grid-search';
    const searchSpace = tuningConfig.searchSpace || {
      learningRate: [1e-5, 5e-5, 1e-4],
      batchSize: [4, 8, 16],
      epochs: [3, 5, 10],
    };

    const trials: HyperparameterTuning['trials'] = [];

    // Generate configurations to test
    const configs = this.generateConfigurations(searchSpace, method);

    logger.debug(`Testing ${configs.length} configurations...`);

    // Test each configuration
    for (let i = 0; i < configs.length; i++) {
      const config = configs[i];
      logger.debug(`Trial ${i + 1}/${configs.length}: ${JSON.stringify(config)}`);

      // Create fine-tune config
      const trialConfig: FineTuneConfig = {
        ...baseConfig,
        hyperparameters: {
          ...baseConfig.hyperparameters,
          ...config,
        },
      };

      // Simulate training (in production, actually train the model)
      const metrics = await this.simulateTraining(trialConfig);

      // Calculate score (combination of metrics)
      const score = this.calculateTuningScore(metrics);

      trials.push({
        hyperparameters: config,
        metrics,
        score,
      });
    }

    // Sort by score
    trials.sort((a, b) => b.score - a.score);

    const best = trials[0];
    logger.debug(`Best configuration: ${JSON.stringify(best.hyperparameters)} (score: ${best.score.toFixed(4)})`);

    return {
      method,
      searchSpace,
      trials,
      bestConfig: best.hyperparameters,
      bestScore: best.score,
    };
  }

  /**
   * Generate predictions for test set
   */
  private async generatePredictions(
    modelId: string,
    testSet: Dataset
  ): Promise<string[]> {
    // In production, call actual model API
    // This is a simulation
    return testSet.examples.map((example) => {
      // Simulate model prediction
      return this.simulateModelPrediction(modelId, example.prompt);
    });
  }

  /**
   * Calculate loss
   */
  private async calculateLoss(predictions: string[], testSet: Dataset): Promise<number> {
    let totalLoss = 0;

    for (let i = 0; i < predictions.length; i++) {
      const predicted = predictions[i];
      const expected = testSet.examples[i].completion;

      // Cross-entropy loss (simplified)
      const loss = this.crossEntropyLoss(predicted, expected);
      totalLoss += loss;
    }

    return totalLoss / predictions.length;
  }

  /**
   * Calculate accuracy metrics
   */
  private calculateAccuracy(
    predictions: string[],
    testSet: Dataset
  ): {
    accuracy: number;
    precision: number;
    recall: number;
    f1Score: number;
  } {
    let correct = 0;
    let truePositives = 0;
    let falsePositives = 0;
    let falseNegatives = 0;

    for (let i = 0; i < predictions.length; i++) {
      const predicted = predictions[i].toLowerCase().trim();
      const expected = testSet.examples[i].completion.toLowerCase().trim();

      // Exact match
      if (predicted === expected) {
        correct++;
        truePositives++;
      } else {
        // Partial match analysis
        const predictedWords = new Set(predicted.split(/\s+/));
        const expectedWords = new Set(expected.split(/\s+/));

        for (const word of predictedWords) {
          if (!expectedWords.has(word)) {
            falsePositives++;
          }
        }

        for (const word of expectedWords) {
          if (!predictedWords.has(word)) {
            falseNegatives++;
          }
        }
      }
    }

    const accuracy = correct / predictions.length;
    const precision =
      truePositives / (truePositives + falsePositives) || 0;
    const recall =
      truePositives / (truePositives + falseNegatives) || 0;
    const f1Score =
      precision + recall > 0
        ? (2 * precision * recall) / (precision + recall)
        : 0;

    return { accuracy, precision, recall, f1Score };
  }

  /**
   * Calculate BLEU score
   */
  private calculateBLEU(predictions: string[], testSet: Dataset): number {
    let totalBLEU = 0;

    for (let i = 0; i < predictions.length; i++) {
      const predicted = predictions[i];
      const reference = testSet.examples[i].completion;

      totalBLEU += this.bleuScore(predicted, reference);
    }

    return totalBLEU / predictions.length;
  }

  /**
   * Calculate ROUGE score
   */
  private calculateROUGE(
    predictions: string[],
    testSet: Dataset
  ): { rouge1: number; rouge2: number; rougeL: number } {
    let rouge1Total = 0;
    let rouge2Total = 0;
    let rougeLTotal = 0;

    for (let i = 0; i < predictions.length; i++) {
      const predicted = predictions[i];
      const reference = testSet.examples[i].completion;

      rouge1Total += this.rougeN(predicted, reference, 1);
      rouge2Total += this.rougeN(predicted, reference, 2);
      rougeLTotal += this.rougeL(predicted, reference);
    }

    return {
      rouge1: rouge1Total / predictions.length,
      rouge2: rouge2Total / predictions.length,
      rougeL: rougeLTotal / predictions.length,
    };
  }

  /**
   * Calculate average tokens per response
   */
  private calculateAvgTokens(predictions: string[]): number {
    const totalTokens = predictions.reduce(
      (sum, pred) => sum + this.estimateTokens(pred),
      0
    );
    return totalTokens / predictions.length;
  }

  /**
   * Calculate similarity between two strings
   */
  private calculateSimilarity(str1: string, str2: string): number {
    const words1 = new Set(str1.toLowerCase().split(/\s+/));
    const words2 = new Set(str2.toLowerCase().split(/\s+/));

    const intersection = new Set([...words1].filter((w) => words2.has(w)));
    const union = new Set([...words1, ...words2]);

    return intersection.size / union.size;
  }

  /**
   * Cross-entropy loss (simplified)
   */
  private crossEntropyLoss(predicted: string, expected: string): number {
    const similarity = this.calculateSimilarity(predicted, expected);
    return -Math.log(Math.max(similarity, 0.001));
  }

  /**
   * BLEU score implementation
   */
  private bleuScore(candidate: string, reference: string): number {
    const candidateWords = candidate.toLowerCase().split(/\s+/);
    const referenceWords = reference.toLowerCase().split(/\s+/);

    // Unigram precision
    const matches = candidateWords.filter((w) => referenceWords.includes(w)).length;
    const precision = matches / candidateWords.length;

    // Brevity penalty
    const bp =
      candidateWords.length >= referenceWords.length
        ? 1
        : Math.exp(1 - referenceWords.length / candidateWords.length);

    return bp * precision;
  }

  /**
   * ROUGE-N score
   */
  private rougeN(candidate: string, reference: string, n: number): number {
    const candidateNgrams = this.getNgrams(candidate, n);
    const referenceNgrams = this.getNgrams(reference, n);

    const matches = candidateNgrams.filter((ng) => referenceNgrams.includes(ng)).length;
    return referenceNgrams.length > 0 ? matches / referenceNgrams.length : 0;
  }

  /**
   * ROUGE-L score (longest common subsequence)
   */
  private rougeL(candidate: string, reference: string): number {
    const candidateWords = candidate.toLowerCase().split(/\s+/);
    const referenceWords = reference.toLowerCase().split(/\s+/);

    const lcs = this.longestCommonSubsequence(candidateWords, referenceWords);
    return referenceWords.length > 0 ? lcs / referenceWords.length : 0;
  }

  /**
   * Get n-grams from text
   */
  private getNgrams(text: string, n: number): string[] {
    const words = text.toLowerCase().split(/\s+/);
    const ngrams: string[] = [];

    for (let i = 0; i <= words.length - n; i++) {
      ngrams.push(words.slice(i, i + n).join(' '));
    }

    return ngrams;
  }

  /**
   * Longest common subsequence
   */
  private longestCommonSubsequence(seq1: string[], seq2: string[]): number {
    const m = seq1.length;
    const n = seq2.length;
    const dp: number[][] = Array(m + 1)
      .fill(0)
      .map(() => Array(n + 1).fill(0));

    for (let i = 1; i <= m; i++) {
      for (let j = 1; j <= n; j++) {
        if (seq1[i - 1] === seq2[j - 1]) {
          dp[i][j] = dp[i - 1][j - 1] + 1;
        } else {
          dp[i][j] = Math.max(dp[i - 1][j], dp[i][j - 1]);
        }
      }
    }

    return dp[m][n];
  }

  /**
   * Generate configurations for hyperparameter tuning
   */
  private generateConfigurations(
    searchSpace: HyperparameterTuning['searchSpace'],
    method: string
  ): Record<string, any>[] {
    if (method === 'grid-search') {
      return this.gridSearch(searchSpace);
    } else if (method === 'random-search') {
      return this.randomSearch(searchSpace, 10);
    } else if (method === 'bayesian') {
      return this.bayesianSearch(searchSpace, 10);
    }

    return [];
  }

  /**
   * Grid search
   */
  private gridSearch(searchSpace: HyperparameterTuning['searchSpace']): Record<string, any>[] {
    const configs: Record<string, any>[] = [];

    for (const lr of searchSpace.learningRate) {
      for (const bs of searchSpace.batchSize) {
        for (const ep of searchSpace.epochs) {
          configs.push({
            learningRate: lr,
            batchSize: bs,
            epochs: ep,
          });
        }
      }
    }

    return configs;
  }

  /**
   * Random search
   */
  private randomSearch(
    searchSpace: HyperparameterTuning['searchSpace'],
    numTrials: number
  ): Record<string, any>[] {
    const configs: Record<string, any>[] = [];

    for (let i = 0; i < numTrials; i++) {
      configs.push({
        learningRate:
          searchSpace.learningRate[
            Math.floor(Math.random() * searchSpace.learningRate.length)
          ],
        batchSize:
          searchSpace.batchSize[Math.floor(Math.random() * searchSpace.batchSize.length)],
        epochs:
          searchSpace.epochs[Math.floor(Math.random() * searchSpace.epochs.length)],
      });
    }

    return configs;
  }

  /**
   * Bayesian search (simplified)
   */
  private bayesianSearch(
    searchSpace: HyperparameterTuning['searchSpace'],
    numTrials: number
  ): Record<string, any>[] {
    // Simplified version - in production, use proper Bayesian optimization
    return this.randomSearch(searchSpace, numTrials);
  }

  /**
   * Simulate model training (for testing)
   */
  private async simulateTraining(config: FineTuneConfig): Promise<EvaluationMetrics> {
    // Simulate training with random metrics
    const lr = config.hyperparameters.learningRate || 1e-4;
    const epochs = config.hyperparameters.epochs || 3;

    // Better hyperparameters = better metrics
    const lrScore = 1 - Math.abs(Math.log10(lr) + 4) / 2; // Optimal around 1e-4
    const epochScore = Math.min(epochs / 5, 1); // More epochs = better (up to a point)

    const baseScore = (lrScore + epochScore) / 2;

    return {
      loss: 0.5 * (1 - baseScore) + Math.random() * 0.1,
      perplexity: Math.exp(0.5 * (1 - baseScore)),
      accuracy: 0.7 + baseScore * 0.2 + Math.random() * 0.1,
      avgTokensPerResponse: 50,
    };
  }

  /**
   * Calculate tuning score
   */
  private calculateTuningScore(metrics: EvaluationMetrics): number {
    // Weighted combination of metrics
    const lossScore = 1 - metrics.loss;
    const accuracyScore = metrics.accuracy || 0;
    const perplexityScore = 1 / (1 + metrics.perplexity);

    return (lossScore * 0.4 + accuracyScore * 0.4 + perplexityScore * 0.2);
  }

  /**
   * Calculate percent improvement
   */
  private percentImprovement(
    baseline: number,
    improved: number,
    lowerIsBetter = false
  ): number {
    if (lowerIsBetter) {
      return ((baseline - improved) / baseline) * 100;
    }
    return ((improved - baseline) / baseline) * 100;
  }

  /**
   * Simulate model prediction
   */
  private simulateModelPrediction(modelId: string, prompt: string): string {
    // Simple simulation - in production, call actual model
    return `Response to: ${prompt.substring(0, 50)}...`;
  }

  /**
   * Estimate tokens
   */
  private estimateTokens(text: string): number {
    return Math.ceil(text.length / 4);
  }
}
